//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock mintable USDC
contract NGNToken is ERC20 {
    constructor() ERC20("NGNToken", "NGNToken") {}

    function mint(uint256 _amount) external {
        _mint(msg.sender, _amount);
    }

    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }

    function burnAll() external {
        uint256 _balanceOf = balanceOf(msg.sender);
        require(_balanceOf > 0, "Nothing to burn");
        _burn(msg.sender, _balanceOf);
    }
}
