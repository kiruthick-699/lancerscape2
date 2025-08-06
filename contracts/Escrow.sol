// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract Escrow is ReentrancyGuard, Ownable, Pausable {
    using Address for address payable;
    
    uint256 private _escrowIds = 0;
    
    struct EscrowPayment {
        uint256 id;
        uint256 jobId;
        address client;
        address freelancer;
        uint256 amount;
        uint256 deadline;
        PaymentStatus status;
        uint256 createdAt;
        uint256 completedAt;
        string disputeReason;
        address disputeInitiator;
        bool isActive;
    }
    
    enum PaymentStatus {
        Pending,
        InProgress,
        Completed,
        Disputed,
        Refunded,
        Cancelled
    }
    
    // Events
    event EscrowCreated(uint256 indexed escrowId, uint256 indexed jobId, address indexed client, uint256 amount);
    event PaymentReleased(uint256 indexed escrowId, address indexed freelancer, uint256 amount);
    event DisputeRaised(uint256 indexed escrowId, address indexed initiator, string reason);
    event DisputeResolved(uint256 indexed escrowId, bool refunded);
    event RefundIssued(uint256 indexed escrowId, address indexed client, uint256 amount);
    event EscrowCancelled(uint256 indexed escrowId, address indexed client);
    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);
    
    // State variables
    mapping(uint256 => EscrowPayment) public escrowPayments;
    mapping(uint256 => uint256) public jobToEscrow; // jobId => escrowId
    mapping(address => uint256[]) public clientEscrows;
    mapping(address => uint256[]) public freelancerEscrows;
    
    // Security: Platform fees and timelock
    uint256 public platformFee = 250; // 2.5% = 250 basis points
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_PLATFORM_FEE = 500; // 5% max
    uint256 public disputePeriod = 7 days;
    uint256 public timelockPeriod = 3 days;
    uint256 public constant MAX_DISPUTE_PERIOD = 30 days;
    uint256 public constant MAX_TIMELOCK_PERIOD = 7 days;
    
    // Security: Dispute resolution
    mapping(uint256 => bool) public disputeResolved;
    mapping(uint256 => address) public disputeResolver;
    mapping(uint256 => uint256) public disputeRaisedAt;
    
    // Security: Access control
    mapping(address => bool) public authorizedOperators;
    mapping(address => bool) public blacklistedAddresses;
    
    // Security: Emergency controls
    bool public emergencyStop;
    
    // Security: Rate limiting
    mapping(address => uint256) public lastEscrowCreation;
    uint256 public constant ESCROW_CREATION_COOLDOWN = 1 hours;
    
    modifier onlyAuthorized() {
        require(msg.sender == owner() || authorizedOperators[msg.sender], "Not authorized");
        _;
    }
    
    modifier notBlacklisted() {
        require(!blacklistedAddresses[msg.sender], "Address is blacklisted");
        _;
    }
    
    modifier notEmergency() {
        require(!emergencyStop, "Contract is in emergency mode");
        _;
    }
    
    modifier escrowExists(uint256 _escrowId) {
        require(_escrowId > 0 && _escrowId < _escrowIds, "Escrow does not exist");
        require(escrowPayments[_escrowId].isActive, "Escrow is not active");
        _;
    }
    
    modifier onlyEscrowClient(uint256 _escrowId) {
        require(escrowPayments[_escrowId].client == msg.sender, "Only escrow client can perform this action");
        _;
    }
    
    modifier onlyEscrowFreelancer(uint256 _escrowId) {
        require(escrowPayments[_escrowId].freelancer == msg.sender, "Only escrow freelancer can perform this action");
        _;
    }
    
    modifier onlyDisputeResolver(uint256 _escrowId) {
        require(disputeResolver[_escrowId] == msg.sender || msg.sender == owner(), "Only dispute resolver can perform this action");
        _;
    }
    
    modifier paymentStatus(uint256 _escrowId, PaymentStatus _status) {
        require(escrowPayments[_escrowId].status == _status, "Payment is not in the required status");
        _;
    }
    
    modifier timelockPassed(uint256 _escrowId) {
        require(block.timestamp >= escrowPayments[_escrowId].createdAt + timelockPeriod, "Timelock not passed");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        _escrowIds++; // Start from 1
    }
    
    // Security: Input validation
    function _validateEscrowInputs(
        uint256 _jobId,
        address _freelancer,
        uint256 _amount
    ) internal pure {
        require(_jobId > 0, "Invalid job ID");
        require(_freelancer != address(0), "Invalid freelancer address");
        require(_amount > 0, "Amount must be greater than 0");
    }
    
    // Security: Rate limiting
    function _checkRateLimit(address _user) internal view {
        if (_user != owner()) {
            require(block.timestamp >= lastEscrowCreation[_user] + ESCROW_CREATION_COOLDOWN, "Rate limit exceeded");
        }
    }
    
    function createEscrow(
        uint256 _jobId,
        address _freelancer,
        uint256 _amount
    ) external 
        payable 
        whenNotPaused 
        notBlacklisted 
        notEmergency 
        nonReentrant 
        returns (uint256) 
    {
        _validateEscrowInputs(_jobId, _freelancer, _amount);
        _checkRateLimit(msg.sender);
        require(msg.value == _amount, "Sent amount must match escrow amount");
        require(_freelancer != msg.sender, "Client cannot be freelancer");
        require(jobToEscrow[_jobId] == 0, "Escrow already exists for this job");
        
        uint256 escrowId = _escrowIds;
        _escrowIds++;
        lastEscrowCreation[msg.sender] = block.timestamp;
        
        escrowPayments[escrowId] = EscrowPayment({
            id: escrowId,
            jobId: _jobId,
            client: msg.sender,
            freelancer: _freelancer,
            amount: _amount,
            deadline: block.timestamp + disputePeriod,
            status: PaymentStatus.Pending,
            createdAt: block.timestamp,
            completedAt: 0,
            disputeReason: "",
            disputeInitiator: address(0),
            isActive: true
        });
        
        jobToEscrow[_jobId] = escrowId;
        clientEscrows[msg.sender].push(escrowId);
        freelancerEscrows[_freelancer].push(escrowId);
        
        emit EscrowCreated(escrowId, _jobId, msg.sender, _amount);
        return escrowId;
    }
    
    function releasePayment(uint256 _escrowId) 
        external 
        whenNotPaused 
        notBlacklisted 
        notEmergency 
        nonReentrant 
        escrowExists(_escrowId)
        paymentStatus(_escrowId, PaymentStatus.Pending)
        onlyEscrowClient(_escrowId)
        timelockPassed(_escrowId)
    {
        EscrowPayment storage escrow = escrowPayments[_escrowId];
        
        uint256 platformFeeAmount = (escrow.amount * platformFee) / BASIS_POINTS;
        uint256 freelancerAmount = escrow.amount - platformFeeAmount;
        
        escrow.status = PaymentStatus.Completed;
        escrow.completedAt = block.timestamp;
        escrow.isActive = false;
        
        // Transfer to freelancer
        payable(escrow.freelancer).transfer(freelancerAmount);
        
        // Transfer platform fee to owner
        if (platformFeeAmount > 0) {
            payable(owner()).transfer(platformFeeAmount);
        }
        
        emit PaymentReleased(_escrowId, escrow.freelancer, freelancerAmount);
    }
    
    function raiseDispute(uint256 _escrowId, string memory _reason) 
        external 
        whenNotPaused 
        notBlacklisted 
        notEmergency 
        nonReentrant 
        escrowExists(_escrowId)
        paymentStatus(_escrowId, PaymentStatus.Pending)
    {
        EscrowPayment storage escrow = escrowPayments[_escrowId];
        require(msg.sender == escrow.client || msg.sender == escrow.freelancer, "Only client or freelancer can raise dispute");
        require(bytes(_reason).length > 0 && bytes(_reason).length <= 500, "Invalid dispute reason");
        require(disputeRaisedAt[_escrowId] == 0, "Dispute already raised");
        
        escrow.status = PaymentStatus.Disputed;
        escrow.disputeReason = _reason;
        escrow.disputeInitiator = msg.sender;
        disputeRaisedAt[_escrowId] = block.timestamp;
        
        emit DisputeRaised(_escrowId, msg.sender, _reason);
    }
    
    function resolveDispute(uint256 _escrowId, bool _refundToClient) 
        external 
        whenNotPaused 
        notBlacklisted 
        notEmergency 
        nonReentrant 
        escrowExists(_escrowId)
        paymentStatus(_escrowId, PaymentStatus.Disputed)
        onlyDisputeResolver(_escrowId)
    {
        EscrowPayment storage escrow = escrowPayments[_escrowId];
        require(!disputeResolved[_escrowId], "Dispute already resolved");
        
        disputeResolved[_escrowId] = true;
        escrow.isActive = false;
        
        if (_refundToClient) {
            escrow.status = PaymentStatus.Refunded;
            payable(escrow.client).transfer(escrow.amount);
            emit RefundIssued(_escrowId, escrow.client, escrow.amount);
        } else {
            escrow.status = PaymentStatus.Completed;
            escrow.completedAt = block.timestamp;
            
            uint256 platformFeeAmount = (escrow.amount * platformFee) / BASIS_POINTS;
            uint256 freelancerAmount = escrow.amount - platformFeeAmount;
            
            payable(escrow.freelancer).transfer(freelancerAmount);
            if (platformFeeAmount > 0) {
                payable(owner()).transfer(platformFeeAmount);
            }
            
            emit PaymentReleased(_escrowId, escrow.freelancer, freelancerAmount);
        }
        
        emit DisputeResolved(_escrowId, _refundToClient);
    }
    
    function cancelEscrow(uint256 _escrowId) 
        external 
        whenNotPaused 
        notBlacklisted 
        notEmergency 
        nonReentrant 
        escrowExists(_escrowId)
        paymentStatus(_escrowId, PaymentStatus.Pending)
        onlyEscrowClient(_escrowId)
    {
        EscrowPayment storage escrow = escrowPayments[_escrowId];
        require(block.timestamp >= escrow.createdAt + timelockPeriod, "Timelock not passed");
        
        escrow.status = PaymentStatus.Cancelled;
        escrow.isActive = false;
        
        payable(escrow.client).transfer(escrow.amount);
        
        emit EscrowCancelled(_escrowId, escrow.client);
    }
    
    // Security: Emergency functions
    function emergencyPause() external onlyOwner {
        _pause();
        emergencyStop = true;
        emit EmergencyPaused(msg.sender);
    }
    
    function emergencyUnpause() external onlyOwner {
        _unpause();
        emergencyStop = false;
        emit EmergencyUnpaused(msg.sender);
    }
    
    // Security: Access control
    function addAuthorizedOperator(address _operator) external onlyOwner {
        authorizedOperators[_operator] = true;
    }
    
    function removeAuthorizedOperator(address _operator) external onlyOwner {
        authorizedOperators[_operator] = false;
    }
    
    function blacklistAddress(address _address) external onlyOwner {
        blacklistedAddresses[_address] = true;
    }
    
    function removeFromBlacklist(address _address) external onlyOwner {
        blacklistedAddresses[_address] = false;
    }
    
    // Security: Parameter management
    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= MAX_PLATFORM_FEE, "Fee too high");
        platformFee = _newFee;
    }
    
    function updateDisputePeriod(uint256 _newPeriod) external onlyOwner {
        require(_newPeriod <= MAX_DISPUTE_PERIOD, "Period too long");
        disputePeriod = _newPeriod;
    }
    
    function updateTimelockPeriod(uint256 _newPeriod) external onlyOwner {
        require(_newPeriod <= MAX_TIMELOCK_PERIOD, "Period too long");
        timelockPeriod = _newPeriod;
    }
    
    function setDisputeResolver(uint256 _escrowId, address _resolver) external onlyOwner {
        require(_resolver != address(0), "Invalid resolver address");
        disputeResolver[_escrowId] = _resolver;
    }
    
    // View functions
    function getEscrow(uint256 _escrowId) external view returns (EscrowPayment memory) {
        require(_escrowId > 0 && _escrowId < _escrowIds, "Escrow does not exist");
        return escrowPayments[_escrowId];
    }
    
    function getClientEscrows(address _client) external view returns (uint256[] memory) {
        return clientEscrows[_client];
    }
    
    function getFreelancerEscrows(address _freelancer) external view returns (uint256[] memory) {
        return freelancerEscrows[_freelancer];
    }
    
    function getTotalEscrows() external view returns (uint256) {
        return _escrowIds - 1;
    }
    
    // Security: Contract recovery (only for emergency)
    function emergencyWithdraw() external onlyOwner {
        require(emergencyStop, "Emergency mode not active");
        payable(owner()).transfer(address(this).balance);
    }
    
    // Security: Fallback function
    receive() external payable {
        revert("Direct payments not accepted");
    }
    
    fallback() external payable {
        revert("Function not found");
    }
} 