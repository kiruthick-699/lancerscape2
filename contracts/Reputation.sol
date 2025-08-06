// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Reputation is ReentrancyGuard, Ownable, ERC721 {
    using Strings for uint256;
    
    uint256 private _badgeIds = 0;
    uint256 private _reviewIds = 0;
    
    struct Badge {
        uint256 id;
        string name;
        string description;
        BadgeRarity rarity;
        BadgeType badgeType;
        uint256 requiredScore;
        bool isActive;
        uint256 createdAt;
    }
    
    struct UserReputation {
        uint256 totalScore;
        uint256 completedJobs;
        uint256 totalEarnings;
        uint256 averageRating;
        uint256 reviewCount;
        mapping(uint256 => bool) earnedBadges;
        uint256[] earnedBadgeIds;
    }
    
    enum BadgeRarity {
        Common,
        Rare,
        Epic,
        Legendary
    }
    
    enum BadgeType {
        Skill,
        Achievement,
        Verification,
        Special
    }
    
    // Events
    event BadgeCreated(uint256 indexed badgeId, string name, BadgeRarity rarity);
    event BadgeEarned(uint256 indexed badgeId, address indexed user);
    event ReputationUpdated(address indexed user, uint256 newScore);
    event ReviewSubmitted(address indexed reviewer, address indexed reviewee, uint256 rating);
    
    // State variables
    mapping(uint256 => Badge) public badges;
    mapping(address => UserReputation) public userReputations;
    mapping(address => mapping(address => uint256)) public userReviews; // reviewer => reviewee => rating
    
    // Badge requirements
    mapping(BadgeRarity => uint256) public rarityScores;
    mapping(BadgeType => uint256) public typeMultipliers;
    
    // Platform settings
    uint256 public minReviewScore = 1;
    uint256 public maxReviewScore = 5;
    uint256 public reputationDecayPeriod = 30 days;
    
    string private _baseTokenURI;
    
    constructor() ERC721("Lancerscape Badges", "LSCP") Ownable(msg.sender) {
        _badgeIds = 1; // Start from 1
        
        // Set default rarity scores
        rarityScores[BadgeRarity.Common] = 100;
        rarityScores[BadgeRarity.Rare] = 500;
        rarityScores[BadgeRarity.Epic] = 1000;
        rarityScores[BadgeRarity.Legendary] = 5000;
        
        // Set type multipliers
        typeMultipliers[BadgeType.Skill] = 1;
        typeMultipliers[BadgeType.Achievement] = 2;
        typeMultipliers[BadgeType.Verification] = 3;
        typeMultipliers[BadgeType.Special] = 5;
    }
    
    modifier badgeExists(uint256 _badgeId) {
        require(_badgeId > 0 && _badgeId < _badgeIds, "Badge does not exist");
        _;
    }
    
    modifier onlyActiveBadge(uint256 _badgeId) {
        require(badges[_badgeId].isActive, "Badge is not active");
        _;
    }
    
    function createBadge(
        string memory _name,
        string memory _description,
        BadgeRarity _rarity,
        BadgeType _badgeType,
        uint256 _requiredScore
    ) external onlyOwner returns (uint256) {
        require(bytes(_name).length > 0, "Badge name cannot be empty");
        require(bytes(_description).length > 0, "Badge description cannot be empty");
        require(_requiredScore > 0, "Required score must be greater than 0");
        
        uint256 badgeId = _badgeIds;
        _badgeIds++;
        
        badges[badgeId] = Badge({
            id: badgeId,
            name: _name,
            description: _description,
            rarity: _rarity,
            badgeType: _badgeType,
            requiredScore: _requiredScore,
            isActive: true,
            createdAt: block.timestamp
        });
        
        emit BadgeCreated(badgeId, _name, _rarity);
        return badgeId;
    }
    
    function earnBadge(uint256 _badgeId) external badgeExists(_badgeId) onlyActiveBadge(_badgeId) {
        Badge storage badge = badges[_badgeId];
        UserReputation storage reputation = userReputations[msg.sender];
        
        require(!reputation.earnedBadges[_badgeId], "Badge already earned");
        require(reputation.totalScore >= badge.requiredScore, "Insufficient reputation score");
        
        reputation.earnedBadges[_badgeId] = true;
        reputation.earnedBadgeIds.push(_badgeId);
        
        _mint(msg.sender, _badgeId);
        
        emit BadgeEarned(_badgeId, msg.sender);
    }
    
    function updateReputation(
        address _user,
        uint256 _score,
        uint256 _earnings,
        uint256 _rating
    ) external onlyOwner {
        UserReputation storage reputation = userReputations[_user];
        
        reputation.totalScore = _score;
        reputation.completedJobs += 1;
        reputation.totalEarnings += _earnings;
        
        // Update average rating
        if (reputation.reviewCount == 0) {
            reputation.averageRating = _rating;
        } else {
            reputation.averageRating = ((reputation.averageRating * reputation.reviewCount) + _rating) / (reputation.reviewCount + 1);
        }
        reputation.reviewCount += 1;
        
        emit ReputationUpdated(_user, _score);
        
        // Check for new badges
        _checkForNewBadges(_user);
    }
    
    function submitReview(address _reviewee, uint256 _rating) external {
        require(_reviewee != msg.sender, "Cannot review yourself");
        require(_rating >= minReviewScore && _rating <= maxReviewScore, "Invalid rating");
        require(_reviewee != address(0), "Invalid reviewee address");
        
        userReviews[msg.sender][_reviewee] = _rating;
        
        emit ReviewSubmitted(msg.sender, _reviewee, _rating);
    }
    
    function _checkForNewBadges(address _user) internal {
        UserReputation storage reputation = userReputations[_user];
        
        for (uint256 i = 1; i < _badgeIds; i++) {
            Badge storage badge = badges[i];
            if (badge.isActive && !reputation.earnedBadges[i] && reputation.totalScore >= badge.requiredScore) {
                reputation.earnedBadges[i] = true;
                reputation.earnedBadgeIds.push(i);
                _mint(_user, i);
                emit BadgeEarned(i, _user);
            }
        }
    }
    
    // View functions
    function getBadge(uint256 _badgeId) external view returns (Badge memory) {
        return badges[_badgeId];
    }
    
    function getUserReputation(address _user) external view returns (
        uint256 totalScore,
        uint256 completedJobs,
        uint256 totalEarnings,
        uint256 averageRating,
        uint256 reviewCount
    ) {
        UserReputation storage reputation = userReputations[_user];
        return (
            reputation.totalScore,
            reputation.completedJobs,
            reputation.totalEarnings,
            reputation.averageRating,
            reputation.reviewCount
        );
    }
    
    function getUserBadges(address _user) external view returns (uint256[] memory) {
        return userReputations[_user].earnedBadgeIds;
    }
    
    function hasBadge(address _user, uint256 _badgeId) external view returns (bool) {
        return userReputations[_user].earnedBadges[_badgeId];
    }
    
    function getReview(address _reviewer, address _reviewee) external view returns (uint256) {
        return userReviews[_reviewer][_reviewee];
    }
    
    function getTotalBadges() external view returns (uint256) {
        return _badgeIds - 1;
    }
    
    // Admin functions
    function setBadgeActive(uint256 _badgeId, bool _active) external onlyOwner badgeExists(_badgeId) {
        badges[_badgeId].isActive = _active;
    }
    
    function setRarityScore(BadgeRarity _rarity, uint256 _score) external onlyOwner {
        rarityScores[_rarity] = _score;
    }
    
    function setTypeMultiplier(BadgeType _type, uint256 _multiplier) external onlyOwner {
        typeMultipliers[_type] = _multiplier;
    }
    
    function setReviewScoreRange(uint256 _min, uint256 _max) external onlyOwner {
        require(_min < _max, "Min must be less than max");
        minReviewScore = _min;
        maxReviewScore = _max;
    }
    
    // ERC721 overrides
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    function setBaseURI(string memory _uri) external onlyOwner {
        _baseTokenURI = _uri;
    }
    
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(_exists(_tokenId), "Badge does not exist");
        
        return string(abi.encodePacked(_baseURI(), _tokenId.toString()));
    }
    
    function _exists(uint256 _tokenId) internal view returns (bool) {
        return _tokenId > 0 && _tokenId < _badgeIds;
    }
} 