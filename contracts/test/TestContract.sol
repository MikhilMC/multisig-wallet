// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TestContract {
    uint256 public i;

    function callMe(uint256 j) public {
        i += j;
    }
}
