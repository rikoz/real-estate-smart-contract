// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Property.sol";

contract NigeriaGovernment is ERC1155, AccessControl {
    bytes32 public constant MINISTRY_ROLE = keccak256("MINISTRY_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    struct Properties {
        uint256 tokenId;
        string tokenURI;
        bool isApproved;
        address property;
        address manager;
    }

    struct BidProperty {
        uint256 highestBid;
        address highestBidder;
        address[] buyers;
        uint256[] amount;
        bool bought;
    }

    uint256 public propertyCounter;
    address public currencyToken;

    mapping(uint256 => string) public tokenURIs;
    mapping(uint256 => Properties) public propertyDetails;
    mapping(string => bool) public propertyExists;
    mapping(uint256 => BidProperty) public propertyBids;
    uint256[] public propertyIds;

    // event
    event PropertyCreated(uint256 indexed tokenId, string indexed tokenURI, address indexed property);
    event PropertyApproved(uint256 indexed tokenId, bool indexed isApproved);
    event PropertySaleStatus(uint256 indexed tokenId, bool indexed status);
    event PropertyBid(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 amount);

    constructor(address _minister, address admin, address ngnToken) ERC1155("https://api.blocknigeria.com/property/{id}.json") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINISTRY_ROLE, _minister);
        _grantRole(VALIDATOR_ROLE, admin);
        currencyToken = ngnToken;
    }

    function createProperty(string[] memory _propertyURI, address[] memory managers) public onlyRole(VALIDATOR_ROLE) {
        uint256 length = _propertyURI.length;
        require (length == managers.length, "Invalid input");
        for (uint256 i = 0; i < length; i++) {
            require(bytes(_propertyURI[i]).length > 0, "Invalid token URI");
            require(!propertyExists[_propertyURI[i]], "Property already exists");
            require(managers[i] != address(0), "Invalid manager address");

            uint256 tokenId = propertyCounter + 1;
            Property property = new Property();
            property.initialized(tokenId, _propertyURI[i], address(this), managers[i]);
            propertyCounter++;
            Properties memory newProperty = Properties(tokenId, _propertyURI[i], false, address(property), managers[i]);
            propertyDetails[tokenId] = newProperty;
            propertyExists[_propertyURI[i]] = true;

            _mint(managers[i], propertyCounter, 1, "");
            propertyIds.push(tokenId);
            emit PropertyCreated(propertyCounter, _propertyURI[i], address(this));
        }
    }

    function setPropertyApproveStatus(uint256[] memory tokenId, bool status) public onlyRole(MINISTRY_ROLE) {
        for (uint256 i = 0; i < tokenId.length; i++) {
            Properties storage property = propertyDetails[tokenId[i]];
            require(property.property != address(0), "Property does not exist");
            require(!propertyDetails[tokenId[i]].isApproved, "Property already approved");
            property.isApproved = true;
            emit PropertyApproved(tokenId[i], status);
        }
    }

    function bidProperty(uint256 tokenId, uint256 amount, address receiver) public {
        Properties storage property = propertyDetails[tokenId];
        require(property.property != address(0), "Property does not exist");
        require(property.isApproved, "Property not approved");
        
        (,,,bool isForSale) = Property(property.property).propertyDetails();

        require(isForSale, "Property not for sale");
        require(amount > propertyBids[tokenId].highestBid, "Amount is less than the highest bid");

        IERC20(currencyToken).transferFrom(msg.sender, address(this), amount);
        propertyBids[tokenId].buyers.push(receiver);
        propertyBids[tokenId].amount.push(amount);
        propertyBids[tokenId].highestBid = amount;
        propertyBids[tokenId].highestBidder = receiver;

        emit PropertyBid(tokenId, msg.sender, receiver, amount);
    }

    function approveBidAndTransferOwnership(uint256 tokenId) public {
        Properties storage property = propertyDetails[tokenId];
        require(property.property != address(0), "Property does not exist");
        require(property.isApproved, "Property not approved");
        if (!hasRole(MINISTRY_ROLE, msg.sender)) {
            require(msg.sender == property.manager, "Caller is not the manager");
        }

        (,,address owner, bool isForSale) = Property(property.property).propertyDetails();

        require(isForSale, "Property not for sale");
        require(propertyBids[tokenId].highestBidder != address(0), "No bid for the property");

        Property(property.property).transferOwnership(owner, propertyBids[tokenId].highestBidder);
        IERC20(currencyToken).transfer(owner, propertyBids[tokenId].highestBid);
        // transfer the funds to the bidders account
        for (uint256 i = 0; i < propertyBids[tokenId].buyers.length; i++) {
            if (propertyBids[tokenId].buyers[i] != propertyBids[tokenId].highestBidder) {
                IERC20(currencyToken).transfer(propertyBids[tokenId].buyers[i], propertyBids[tokenId].amount[i]);
            }
        }
        // clear the bid
        propertyBids[tokenId].highestBid = 0;
        propertyBids[tokenId].highestBidder = address(0);
        propertyBids[tokenId].bought = true;
    }

    function setPropertySaleStatus(uint256 tokenId, bool status) public {
        Properties storage property = propertyDetails[tokenId];
        require(property.property != address(0), "Property does not exist");
        require(propertyBids[tokenId].highestBid == 0, "Amount is less than the highest bid");
        propertyBids[tokenId].bought = false;
        (,,address manager,) = Property(property.property).propertyDetails();

        require(manager == msg.sender, "Caller is not the manager");
        Property(property.property).setSaleStatus(status);
        emit PropertySaleStatus(property.tokenId, status);
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal {
        tokenURIs[tokenId] = _tokenURI;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function getBidProperty(uint256 tokenId) public view returns (address, uint256, address[] memory, uint256[] memory, bool) {
        address highestBidder = propertyBids[tokenId].highestBidder;
        uint256 highestBid = propertyBids[tokenId].highestBid;
        address[] memory buyers = propertyBids[tokenId].buyers;
        uint256[] memory amount = propertyBids[tokenId].amount;
        bool bought = propertyBids[tokenId].bought;
        return (highestBidder, highestBid, buyers, amount, bought);
    }
}