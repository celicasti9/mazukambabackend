"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAZU_ABI = exports.MAZU_TOKEN_ADDRESS = void 0;
// MAZU token addresses for different networks
exports.MAZU_TOKEN_ADDRESS = {
    base: '0x3C301806E72E67092A280B9cCd38B580D35D0a7B',
    baseTestnet: '0x3C301806E72E67092A280B9cCd38B580D35D0a7B',
    aetherius: '0x3C301806E72E67092A280B9cCd38B580D35D0a7B',
    aetheriusTestnet: '0x3C301806E72E67092A280B9cCd38B580D35D0a7B'
};
// Standard ERC20 functions and events
exports.MAZU_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function transfer(address to, uint amount) returns (bool)',
    'function transferFrom(address sender, address recipient, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)'
];
