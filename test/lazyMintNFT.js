const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("LazyMintNFT.sol", () => {
  let owner, ownerAddress;
  let account1, account1Address;
  let LazyMintNFT, lazyMintNFT, lazyMintNFTAddress;

  beforeEach(async () => {
    [owner, account1] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    account1Address = await account1.getAddress();

    LazyMintNFT = await ethers.getContractFactory("LazyMintNFT");
    lazyMintNFT = await LazyMintNFT.deploy("Lazy Mint", "LMINT");
    await lazyMintNFT.deployed();
    lazyMintNFTAddress = await lazyMintNFT.address;
  });

  describe("Lazy Minting", () => {
    it("Should be able to lazy mint", async () => {
      let accountBalance = await lazyMintNFT.balanceOf(account1Address);
      expect(accountBalance).to.equal(0);

      await lazyMintNFT.connect(account1).lazyMint(account1Address);

      accountBalance = await lazyMintNFT.balanceOf(account1Address);
      expect(accountBalance).to.equal(1);

      const nftOwner = await lazyMintNFT.ownerOf(0);
      expect(nftOwner).to.equal(account1Address);
    });
  });
});
