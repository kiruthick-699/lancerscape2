// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract JobPosting is ReentrancyGuard, Ownable, Pausable {
    using Address for address payable;
    
    uint256 private _jobIds = 0;
    uint256 private _proposalIds = 0;
    
    // Security: Rate limiting
    mapping(address => uint256) public lastJobPostTime;
    mapping(address => uint256) public lastProposalTime;
    uint256 public constant JOB_POST_COOLDOWN = 1 hours;
    uint256 public constant PROPOSAL_COOLDOWN = 30 minutes;
    
    // Security: Maximum limits
    uint256 public constant MAX_JOB_BUDGET = 100 ether;
    uint256 public constant MAX_JOB_DURATION = 365 days;
    uint256 public constant MIN_JOB_DURATION = 1 hours;
    
    // Security: Platform fees and limits
    uint256 public platformFee = 250; // 2.5% = 250 basis points
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_PLATFORM_FEE = 500; // 5% max
    
    struct Job {
        uint256 id;
        address client;
        string title;
        string description;
        uint256 budget;
        uint256 deadline;
        JobStatus status;
        uint8 category;
        bool isRemote;
        uint256 createdAt;
        uint256 acceptedAt;
        address freelancer;
        bool isActive;
    }
    
    struct Proposal {
        uint256 id;
        uint256 jobId;
        address freelancer;
        uint256 proposedAmount;
        string coverLetter;
        uint256 deliveryTime;
        uint256 submittedAt;
        bool isActive;
    }
    
    enum JobStatus {
        Open,
        InProgress,
        Completed,
        Cancelled,
        Disputed
    }
    
    // Events
    event JobPosted(uint256 indexed jobId, address indexed client, string title, uint256 budget);
    event JobUpdated(uint256 indexed jobId, string title, uint256 budget);
    event JobCancelled(uint256 indexed jobId, address indexed client);
    event ProposalSubmitted(uint256 indexed proposalId, uint256 indexed jobId, address indexed freelancer);
    event ProposalAccepted(uint256 indexed proposalId, uint256 indexed jobId, address indexed freelancer);
    event JobCompleted(uint256 indexed jobId, address indexed freelancer);
    event PlatformFeeUpdated(uint256 newFee);
    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);
    
    // State variables
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => uint256[]) public jobProposals;
    mapping(address => uint256[]) public clientJobs;
    mapping(address => uint256[]) public freelancerJobs;
    mapping(address => uint256[]) public freelancerProposals;
    
    // Security: Access control
    mapping(address => bool) public authorizedOperators;
    mapping(address => bool) public blacklistedAddresses;
    
    // Security: Emergency controls
    bool public emergencyStop;
    
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
    
    modifier validJobId(uint256 _jobId) {
        require(_jobId > 0 && _jobId <= _jobIds, "Invalid job ID");
        require(jobs[_jobId].isActive, "Job is not active");
        _;
    }
    
    modifier validProposalId(uint256 _proposalId) {
        require(_proposalId > 0 && _proposalId <= _proposalIds, "Invalid proposal ID");
        require(proposals[_proposalId].isActive, "Proposal is not active");
        _;
    }
    
    modifier onlyJobClient(uint256 _jobId) {
        require(jobs[_jobId].client == msg.sender, "Only job client can perform this action");
        _;
    }
    
    modifier onlyJobFreelancer(uint256 _jobId) {
        require(jobs[_jobId].freelancer == msg.sender, "Only job freelancer can perform this action");
        _;
    }
    
    modifier jobStatus(uint256 _jobId, JobStatus _status) {
        require(jobs[_jobId].status == _status, "Job is not in the required status");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        _jobIds = 1; // Start from 1
        _proposalIds = 1; // Start from 1
    }
    
    // Security: Input validation and sanitization
    function _validateJobInputs(
        string memory _title,
        string memory _description,
        uint256 _budget,
        uint256 _deadline
    ) internal view {
        require(bytes(_title).length > 0 && bytes(_title).length <= 200, "Invalid title length");
        require(bytes(_description).length > 0 && bytes(_description).length <= 2000, "Invalid description length");
        require(_budget > 0 && _budget <= MAX_JOB_BUDGET, "Invalid budget");
        require(_deadline > block.timestamp + MIN_JOB_DURATION, "Deadline too soon");
        require(_deadline <= block.timestamp + MAX_JOB_DURATION, "Deadline too far");
    }
    
    function _validateProposalInputs(
        uint256 _proposedAmount,
        string memory _coverLetter,
        uint256 _deliveryTime
    ) internal pure {
        require(_proposedAmount > 0, "Proposed amount must be greater than 0");
        require(bytes(_coverLetter).length > 0 && bytes(_coverLetter).length <= 1000, "Invalid cover letter length");
        require(_deliveryTime > 0 && _deliveryTime <= 365 days, "Invalid delivery time");
    }
    
    // Rate limiting
    function _checkRateLimit(address _user, uint256 _cooldown) internal view {
        uint256 lastAction = _user == owner() ? 0 : 
            (lastJobPostTime[_user] > lastProposalTime[_user] ? lastJobPostTime[_user] : lastProposalTime[_user]);
        require(block.timestamp >= lastAction + _cooldown, "Rate limit exceeded");
    }
    
    function postJob(
        string memory _title,
        string memory _description,
        uint256 _budget,
        uint256 _deadline,
        uint8 _category,
        bool _isRemote
    ) external 
        whenNotPaused 
        notBlacklisted 
        notEmergency 
        nonReentrant 
        returns (uint256) 
    {
        _checkRateLimit(msg.sender, JOB_POST_COOLDOWN);
        _validateJobInputs(_title, _description, _budget, _deadline);
        
        uint256 jobId = _jobIds;
        _jobIds++;
        lastJobPostTime[msg.sender] = block.timestamp;
        
        jobs[jobId] = Job({
            id: jobId,
            client: msg.sender,
            title: _title,
            description: _description,
            budget: _budget,
            deadline: _deadline,
            status: JobStatus.Open,
            category: _category,
            isRemote: _isRemote,
            createdAt: block.timestamp,
            acceptedAt: 0,
            freelancer: address(0),
            isActive: true
        });
        
        clientJobs[msg.sender].push(jobId);
        
        emit JobPosted(jobId, msg.sender, _title, _budget);
        return jobId;
    }
    
    function submitProposal(
        uint256 _jobId,
        uint256 _proposedAmount,
        string memory _coverLetter,
        uint256 _deliveryTime
    ) external 
        whenNotPaused 
        notBlacklisted 
        notEmergency 
        nonReentrant 
        validJobId(_jobId)
        jobStatus(_jobId, JobStatus.Open)
    {
        require(jobs[_jobId].client != msg.sender, "Client cannot submit proposal");
        _checkRateLimit(msg.sender, PROPOSAL_COOLDOWN);
        _validateProposalInputs(_proposedAmount, _coverLetter, _deliveryTime);
        require(_proposedAmount <= jobs[_jobId].budget, "Proposed amount exceeds budget");
        
        uint256 proposalId = _proposalIds;
        _proposalIds++;
        lastProposalTime[msg.sender] = block.timestamp;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            jobId: _jobId,
            freelancer: msg.sender,
            proposedAmount: _proposedAmount,
            coverLetter: _coverLetter,
            deliveryTime: _deliveryTime,
            submittedAt: block.timestamp,
            isActive: true
        });
        
        jobProposals[_jobId].push(proposalId);
        freelancerProposals[msg.sender].push(proposalId);
        
        emit ProposalSubmitted(proposalId, _jobId, msg.sender);
    }
    
    function acceptProposal(uint256 _proposalId) 
        external 
        whenNotPaused 
        notBlacklisted 
        notEmergency 
        nonReentrant 
        validProposalId(_proposalId)
    {
        Proposal storage proposal = proposals[_proposalId];
        require(jobs[proposal.jobId].client == msg.sender, "Only job client can accept proposal");
        require(jobs[proposal.jobId].status == JobStatus.Open, "Job is not open");
        
        jobs[proposal.jobId].status = JobStatus.InProgress;
        jobs[proposal.jobId].freelancer = proposal.freelancer;
        jobs[proposal.jobId].acceptedAt = block.timestamp;
        
        freelancerJobs[proposal.freelancer].push(proposal.jobId);
        
        emit ProposalAccepted(_proposalId, proposal.jobId, proposal.freelancer);
    }
    
    function completeJob(uint256 _jobId) 
        external 
        whenNotPaused 
        notBlacklisted 
        notEmergency 
        nonReentrant 
        validJobId(_jobId)
        jobStatus(_jobId, JobStatus.InProgress)
        onlyJobFreelancer(_jobId)
    {
        jobs[_jobId].status = JobStatus.Completed;
        emit JobCompleted(_jobId, msg.sender);
    }
    
    function cancelJob(uint256 _jobId) 
        external 
        whenNotPaused 
        notBlacklisted 
        notEmergency 
        nonReentrant 
        validJobId(_jobId)
        jobStatus(_jobId, JobStatus.Open)
        onlyJobClient(_jobId)
    {
        jobs[_jobId].status = JobStatus.Cancelled;
        jobs[_jobId].isActive = false;
        emit JobCancelled(_jobId, msg.sender);
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
    
    // Security: Platform fee management
    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= MAX_PLATFORM_FEE, "Fee too high");
        platformFee = _newFee;
        emit PlatformFeeUpdated(_newFee);
    }
    
    // View functions
    function getJob(uint256 _jobId) external view returns (Job memory) {
        require(_jobId > 0 && _jobId < _jobIds, "Job does not exist");
        return jobs[_jobId];
    }
    
    function getProposal(uint256 _proposalId) external view returns (Proposal memory) {
        require(_proposalId > 0 && _proposalId < _proposalIds, "Proposal does not exist");
        return proposals[_proposalId];
    }
    
    function getJobProposals(uint256 _jobId) external view returns (uint256[] memory) {
        return jobProposals[_jobId];
    }
    
    function getClientJobs(address _client) external view returns (uint256[] memory) {
        return clientJobs[_client];
    }
    
    function getFreelancerJobs(address _freelancer) external view returns (uint256[] memory) {
        return freelancerJobs[_freelancer];
    }
    
    function getTotalJobs() external view returns (uint256) {
        return _jobIds - 1;
    }
    
    function getTotalProposals() external view returns (uint256) {
        return _proposalIds - 1;
    }
    
    // Security: Contract recovery (only for emergency)
    function emergencyWithdraw() external onlyOwner {
        require(emergencyStop, "Emergency mode not active");
        payable(owner()).transfer(address(this).balance);
    }
} 