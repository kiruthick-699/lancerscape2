// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Escrow is ReentrancyGuard, Ownable, Pausable {
    using Address for address payable;
    using Counters for Counters.Counter;
    
    Counters.Counter private _escrowIds;
    
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
        uint256 lastActivity;
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
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event DisputePeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    event TimelockPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    
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
    
    // Security: Activity tracking
    mapping(uint256 => uint256) public lastActivity;
    uint256 public constant MAX_INACTIVITY_PERIOD = 90 days;
    
    // Security: Contract limits
    uint256 public constant MAX_ESCROW_AMOUNT = 100 ether;
    uint256 public constant MIN_ESCROW_AMOUNT = 0.001 ether;
    
    // Security: Multi-sig support
    mapping(address => bool) public multiSigSigners;
    uint256 public requiredSignatures = 2;
    
    // Security: Timelock for critical operations
    mapping(bytes32 => uint256) public pendingOperations;
    uint256 public timelockDelay = 2 days;
    
    // Modifiers
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
        require(_escrowId > 0 && _escrowId <= _escrowIds.current(), "Escrow does not exist");
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
    
    modifier notExpired(uint256 _escrowId) {
        require(block.timestamp <= escrowPayments[_escrowId].deadline, "Escrow has expired");
        _;
    }
    
    modifier validAmount(uint256 _amount) {
        require(_amount >= MIN_ESCROW_AMOUNT, "Amount too low");
        require(_amount <= MAX_ESCROW_AMOUNT, "Amount too high");
        _;
    }
    
    // Security: Timelock modifier for critical operations
    modifier timelocked(bytes32 _operationId) {
        require(pendingOperations[_operationId] != 0, "Operation not scheduled");
        require(block.timestamp >= pendingOperations[_operationId] + timelockDelay, "Timelock not passed");
        delete pendingOperations[_operationId];
        _;
    }
    
    constructor() Ownable(msg.sender) {
        // Initialize with reasonable defaults
        _escrowIds.increment(); // Start from 1
        multiSigSigners[msg.sender] = true;
    }
    
    // Security: Input validation with overflow protection
    function _validateEscrowInputs(
        uint256 _jobId,
        address _freelancer,
        uint256 _amount
    ) internal pure {
        require(_jobId > 0, "Invalid job ID");
        require(_freelancer != address(0), "Invalid freelancer address");
        require(_freelancer != address(this), "Freelancer cannot be contract");
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= MAX_ESCROW_AMOUNT, "Amount exceeds maximum");
    }
    
    // Security: Safe math for fee calculations
    function _calculatePlatformFee(uint256 _amount) internal view returns (uint256) {
        require(_amount > 0, "Amount must be greater than 0");
        uint256 fee = (_amount * platformFee) / BASIS_POINTS;
        require(fee <= _amount, "Fee calculation overflow");
        return fee;
    }
    
    // Security: Rate limiting with overflow protection
    function _checkRateLimit(address _user) internal view {
        if (_user != owner()) {
            require(block.timestamp >= lastEscrowCreation[_user] + ESCROW_CREATION_COOLDOWN, "Rate limit exceeded");
        }
    }
    
    // Security: Activity tracking
    function _updateActivity(uint256 _escrowId) internal {
        lastActivity[_escrowId] = block.timestamp;
        escrowPayments[_escrowId].lastActivity = block.timestamp;
    }
    
    // Security: Cleanup expired escrows
    function _cleanupExpiredEscrow(uint256 _escrowId) internal {
        EscrowPayment storage escrow = escrowPayments[_escrowId];
        if (escrow.isActive && 
            escrow.status == PaymentStatus.Pending && 
            block.timestamp > escrow.deadline + MAX_INACTIVITY_PERIOD) {
            
            escrow.isActive = false;
            escrow.status = PaymentStatus.Cancelled;
            
            // Refund to client
            payable(escrow.client).transfer(escrow.amount);
            
            emit EscrowCancelled(_escrowId, escrow.client);
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
        validAmount(_amount)
        returns (uint256) 
    {
        _validateEscrowInputs(_jobId, _freelancer, _amount);
        _checkRateLimit(msg.sender);
        require(msg.value == _amount, "Sent amount must match escrow amount");
        require(_freelancer != msg.sender, "Client cannot be freelancer");
        require(jobToEscrow[_jobId] == 0, "Escrow already exists for this job");
        
        uint256 escrowId = _escrowIds.current();
        _escrowIds.increment();
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
            isActive: true,
            lastActivity: block.timestamp
        });
        
        jobToEscrow[_jobId] = escrowId;
        clientEscrows[msg.sender].push(escrowId);
        freelancerEscrows[_freelancer].push(escrowId);
        
        _updateActivity(escrowId);
        
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
        notExpired(_escrowId)
    {
        EscrowPayment storage escrow = escrowPayments[_escrowId];
        
        uint256 platformFeeAmount = _calculatePlatformFee(escrow.amount);
        uint256 freelancerAmount = escrow.amount - platformFeeAmount;
        
        escrow.status = PaymentStatus.Completed;
        escrow.completedAt = block.timestamp;
        escrow.isActive = false;
        
        _updateActivity(_escrowId);
        
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
        notExpired(_escrowId)
    {
        EscrowPayment storage escrow = escrowPayments[_escrowId];
        require(msg.sender == escrow.client || msg.sender == escrow.freelancer, "Only client or freelancer can raise dispute");
        require(bytes(_reason).length > 0 && bytes(_reason).length <= 500, "Invalid dispute reason");
        require(disputeRaisedAt[_escrowId] == 0, "Dispute already raised");
        
        escrow.status = PaymentStatus.Disputed;
        escrow.disputeReason = _reason;
        escrow.disputeInitiator = msg.sender;
        disputeRaisedAt[_escrowId] = block.timestamp;
        
        _updateActivity(_escrowId);
        
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
        
        _updateActivity(_escrowId);
        
        if (_refundToClient) {
            escrow.status = PaymentStatus.Refunded;
            payable(escrow.client).transfer(escrow.amount);
            emit RefundIssued(_escrowId, escrow.client, escrow.amount);
        } else {
            escrow.status = PaymentStatus.Completed;
            escrow.completedAt = block.timestamp;
            
            uint256 platformFeeAmount = _calculatePlatformFee(escrow.amount);
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
        timelockPassed(_escrowId)
    {
        EscrowPayment storage escrow = escrowPayments[_escrowId];
        
        escrow.status = PaymentStatus.Cancelled;
        escrow.isActive = false;
        
        _updateActivity(_escrowId);
        
        payable(escrow.client).transfer(escrow.amount);
        
        emit EscrowCancelled(_escrowId, escrow.client);
    }
    
    // Security: Emergency functions with timelock
    function scheduleEmergencyPause() external onlyOwner {
        bytes32 operationId = keccak256(abi.encodePacked("emergency_pause", block.timestamp));
        pendingOperations[operationId] = block.timestamp;
    }
    
    function emergencyPause() external onlyOwner timelocked(keccak256(abi.encodePacked("emergency_pause", pendingOperations[keccak256(abi.encodePacked("emergency_pause", block.timestamp - timelockDelay))])) {
        _pause();
        emergencyStop = true;
        emit EmergencyPaused(msg.sender);
    }
    
    function emergencyUnpause() external onlyOwner {
        _unpause();
        emergencyStop = false;
        emit EmergencyUnpaused(msg.sender);
    }
    
    // Security: Access control with timelock
    function scheduleAddAuthorizedOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "Invalid operator address");
        bytes32 operationId = keccak256(abi.encodePacked("add_operator", _operator, block.timestamp));
        pendingOperations[operationId] = block.timestamp;
    }
    
    function addAuthorizedOperator(address _operator) external onlyOwner timelocked(keccak256(abi.encodePacked("add_operator", _operator, pendingOperations[keccak256(abi.encodePacked("add_operator", _operator, block.timestamp - timelockDelay))])) {
        authorizedOperators[_operator] = true;
    }
    
    function removeAuthorizedOperator(address _operator) external onlyOwner {
        authorizedOperators[_operator] = false;
    }
    
    function blacklistAddress(address _address) external onlyOwner {
        require(_address != address(0), "Invalid address");
        blacklistedAddresses[_address] = true;
    }
    
    function removeFromBlacklist(address _address) external onlyOwner {
        blacklistedAddresses[_address] = false;
    }
    
    // Security: Parameter management with timelock
    function scheduleUpdatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= MAX_PLATFORM_FEE, "Fee too high");
        bytes32 operationId = keccak256(abi.encodePacked("update_fee", _newFee, block.timestamp));
        pendingOperations[operationId] = block.timestamp;
    }
    
    function updatePlatformFee(uint256 _newFee) external onlyOwner timelocked(keccak256(abi.encodePacked("update_fee", _newFee, pendingOperations[keccak256(abi.encodePacked("update_fee", _newFee, block.timestamp - timelockDelay))])) {
        require(_newFee <= MAX_PLATFORM_FEE, "Fee too high");
        uint256 oldFee = platformFee;
        platformFee = _newFee;
        emit PlatformFeeUpdated(oldFee, _newFee);
    }
    
    function updateDisputePeriod(uint256 _newPeriod) external onlyOwner {
        require(_newPeriod <= MAX_DISPUTE_PERIOD, "Period too long");
        uint256 oldPeriod = disputePeriod;
        disputePeriod = _newPeriod;
        emit DisputePeriodUpdated(oldPeriod, _newPeriod);
    }
    
    function updateTimelockPeriod(uint256 _newPeriod) external onlyOwner {
        require(_newPeriod <= MAX_TIMELOCK_PERIOD, "Period too long");
        uint256 oldPeriod = timelockPeriod;
        timelockPeriod = _newPeriod;
        emit TimelockPeriodUpdated(oldPeriod, _newPeriod);
    }
    
    function setDisputeResolver(uint256 _escrowId, address _resolver) external onlyOwner {
        require(_resolver != address(0), "Invalid resolver address");
        disputeResolver[_escrowId] = _resolver;
    }
    
    // Security: Multi-sig support
    function addMultiSigSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Invalid signer address");
        multiSigSigners[_signer] = true;
    }
    
    function removeMultiSigSigner(address _signer) external onlyOwner {
        multiSigSigners[_signer] = false;
    }
    
    function updateRequiredSignatures(uint256 _required) external onlyOwner {
        require(_required > 0 && _required <= 5, "Invalid signature count");
        requiredSignatures = _required;
    }
    
    // View functions
    function getEscrow(uint256 _escrowId) external view returns (EscrowPayment memory) {
        require(_escrowId > 0 && _escrowId <= _escrowIds.current(), "Escrow does not exist");
        return escrowPayments[_escrowId];
    }
    
    function getClientEscrows(address _client) external view returns (uint256[] memory) {
        return clientEscrows[_client];
    }
    
    function getFreelancerEscrows(address _freelancer) external view returns (uint256[] memory) {
        return freelancerEscrows[_freelancer];
    }
    
    function getTotalEscrows() external view returns (uint256) {
        return _escrowIds.current();
    }
    
    function isEscrowActive(uint256 _escrowId) external view returns (bool) {
        if (_escrowId == 0 || _escrowId > _escrowIds.current()) return false;
        return escrowPayments[_escrowId].isActive;
    }
    
    // Security: Contract recovery (only for emergency)
    function emergencyWithdraw() external onlyOwner {
        require(emergencyStop, "Emergency mode not active");
        payable(owner()).transfer(address(this).balance);
    }
    
    // Security: Cleanup function for expired escrows
    function cleanupExpiredEscrows(uint256[] calldata _escrowIds) external onlyOwner {
        for (uint256 i = 0; i < _escrowIds.length; i++) {
            _cleanupExpiredEscrow(_escrowIds[i]);
        }
    }
    
    // Security: Fallback function
    receive() external payable {
        revert("Direct payments not accepted");
    }
    
    fallback() external payable {
        revert("Function not found");
    }
} 