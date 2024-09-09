// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Property is AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    address public factory;

    struct PropertyDetails {
        uint256 propertyId;
        string propertyURL;
        address manager;
        bool isForSale;
    }

    PropertyDetails public propertyDetails;

    constructor() {
        _grantRole(OWNER_ROLE, msg.sender);
    }

    function initialized(uint256 _propertyId, string memory _propertyURL, address _factory, address _manager) external {
        require(hasRole(OWNER_ROLE, msg.sender), "Caller is not the owner");
        propertyDetails.propertyId = _propertyId;
        propertyDetails.propertyURL = _propertyURL;
        factory = _factory;
        propertyDetails.manager = _manager;
        _grantRole(MANAGER_ROLE, _manager);
    }

    function transferOwnership(address _currentOwner, address _newOwner) external {
        require(hasRole(OWNER_ROLE, msg.sender), "Caller is not the owner");
        require(!hasRole(MANAGER_ROLE, _newOwner), "New owner cannot be the current manager");
        require(hasRole(OWNER_ROLE, _currentOwner), "Current owner does not have the owner role");
        _grantRole(OWNER_ROLE, _newOwner);
        revokeRole(OWNER_ROLE, _currentOwner);
    }

    function setSaleStatus(bool _status) external {
        require(hasRole(OWNER_ROLE, msg.sender), "Caller is not the owner");
        propertyDetails.isForSale = _status;
    }

}