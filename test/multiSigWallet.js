const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("MultiSigWallet.sol", () => {
  let MultiSigWalletFactory, multiSigWallet, multiSigWalletAddress;

  let owner1, owner2, owner3, owner4, owner5, owner6, account1, account2;
  let owner1Address,
    owner2Address,
    owner3Address,
    owner4Address,
    owner5Address,
    owner6Address,
    account1Address,
    account2Address;

  beforeEach(async () => {
    [owner1, owner2, owner3, owner4, owner5, owner6, account1, account2] =
      await ethers.getSigners();

    owner1Address = await owner1.getAddress();
    owner2Address = await owner2.getAddress();
    owner3Address = await owner3.getAddress();
    owner4Address = await owner4.getAddress();
    owner5Address = await owner5.getAddress();
    owner6Address = await owner6.getAddress();
    account1Address = await account1.getAddress();
    account2Address = await account2.getAddress();

    MultiSigWalletFactory = await ethers.getContractFactory("MultiSigWallet");
    multiSigWallet = await MultiSigWalletFactory.deploy(
      [
        owner1Address,
        owner2Address,
        owner3Address,
        owner4Address,
        owner5Address,
        owner6Address,
      ],
      4
    );
    await multiSigWallet.deployed();
    multiSigWalletAddress = await multiSigWallet.address;
  });

  describe("Correct setup", () => {
    it("Should have all the owner addresses correctly", async () => {
      let address1, address2, address3, address4, address5, address6, status;
      address1 = await multiSigWallet.owners(0);
      address2 = await multiSigWallet.owners(1);
      address3 = await multiSigWallet.owners(2);
      address4 = await multiSigWallet.owners(3);
      address5 = await multiSigWallet.owners(4);
      address6 = await multiSigWallet.owners(5);

      expect(address1).to.equal(owner1Address);
      expect(address2).to.equal(owner2Address);
      expect(address3).to.equal(owner3Address);
      expect(address4).to.equal(owner4Address);
      expect(address5).to.equal(owner5Address);
      expect(address6).to.equal(owner6Address);

      status = await multiSigWallet.isOwner(owner1Address);
      expect(status).to.true;

      status = await multiSigWallet.isOwner(owner2Address);
      expect(status).to.true;

      status = await multiSigWallet.isOwner(owner3Address);
      expect(status).to.true;

      status = await multiSigWallet.isOwner(owner4Address);
      expect(status).to.true;

      status = await multiSigWallet.isOwner(owner5Address);
      expect(status).to.true;

      status = await multiSigWallet.isOwner(owner6Address);
      expect(status).to.true;

      status = await multiSigWallet.isOwner(account1Address);
      expect(status).to.false;

      status = await multiSigWallet.isOwner(account2Address);
      expect(status).to.false;
    });

    it("Should have correct number of required votes", async () => {
      let reqVotes = await multiSigWallet.requiredVotes();
      expect(reqVotes).to.equal(4);
    });
  });

  describe("Setup errors", () => {
    it("Should revert if owners array length is 0", async () => {
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      await expect(MultiSigWallet.deploy([], 4)).to.be.revertedWith(
        "Owners required"
      );
    });

    it("Should revert if required votes is invalid", async () => {
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      await expect(
        MultiSigWallet.deploy(
          [
            owner1Address,
            owner2Address,
            owner3Address,
            owner4Address,
            owner5Address,
            owner6Address,
          ],
          7
        )
      ).to.be.revertedWith("Invalid number of required votes");
    });

    it("Should revert if any of the owner is a zero address", async () => {
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      await expect(
        MultiSigWallet.deploy(
          [
            owner1Address,
            owner2Address,
            ethers.constants.AddressZero,
            owner4Address,
            owner5Address,
            owner6Address,
          ],
          4
        )
      ).to.be.revertedWith("Zero address");
    });

    it("Should revert if any of the owner is a zero address", async () => {
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      await expect(
        MultiSigWallet.deploy(
          [
            owner1Address,
            owner2Address,
            owner3Address,
            owner3Address,
            owner5Address,
            owner6Address,
          ],
          4
        )
      ).to.be.revertedWith("Owner is not unique");
    });
  });

  describe("Submitting the transaction proposals", () => {
    it("Should be able to submit transaction proposal", async () => {
      await multiSigWallet
        .connect(owner1)
        .submitTransactionProposal(
          owner2Address,
          ethers.utils.parseEther("1"),
          ethers.constants.HashZero,
          300
        );

      const transaction = await multiSigWallet.transactionProposals(0);
      const blockBeforeNumber = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockBeforeNumber);
      const startTime = blockBefore.timestamp;
      const endTime = startTime + 300;

      expect(transaction["to"]).to.equal(owner2Address);
      expect(transaction["value"]).to.equal(ethers.utils.parseEther("1"));
      expect(transaction["data"]).to.equal(ethers.constants.HashZero);
      expect(transaction["numberOfApprovals"]).to.equal(0);
      expect(transaction["startTime"]).to.equal(startTime);
      expect(transaction["endTime"]).to.equal(endTime);
      expect(transaction["executed"]).to.false;
    });

    it("Should revert from submitting transaction, because the function called address is not an owner", async () => {
      await expect(
        multiSigWallet
          .connect(account1)
          .submitTransactionProposal(
            owner2Address,
            ethers.utils.parseEther("1"),
            ethers.constants.HashZero,
            300
          )
      ).to.be.revertedWith("Not owner");
    });

    it("Should revert from submitting transaction, because the time duration is 0", async () => {
      await expect(
        multiSigWallet
          .connect(owner1)
          .submitTransactionProposal(
            owner2Address,
            ethers.utils.parseEther("1"),
            ethers.constants.HashZero,
            0
          )
      ).to.be.revertedWith("Zero time duration");
    });
  });

  describe("Supporting a transaction proposal", () => {
    beforeEach(async () => {
      await multiSigWallet
        .connect(owner1)
        .submitTransactionProposal(
          owner2Address,
          ethers.utils.parseEther("1"),
          ethers.constants.HashZero,
          300
        );
    });

    it("Should be able to support transaction proposal", async () => {
      let transaction = await multiSigWallet.transactionProposals(0);
      expect(transaction["numberOfApprovals"]).to.equal(0);

      let status = await multiSigWallet.supportTransaction(0, owner1Address);
      expect(status).to.false;

      await multiSigWallet.connect(owner1).supportTransactionProposal(0);

      transaction = await multiSigWallet.transactionProposals(0);
      expect(transaction["numberOfApprovals"]).to.equal(1);

      status = await multiSigWallet.supportTransaction(0, owner1Address);
      expect(status).to.true;
    });

    it("Should revert, if a non-owner supports transaction proposal", async () => {
      await expect(
        multiSigWallet.connect(account1).supportTransactionProposal(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should revert, if we try to support transaction proposal which does not exists", async () => {
      await expect(
        multiSigWallet.connect(owner1).supportTransactionProposal(1)
      ).to.be.revertedWith("Transaction does not exists");
    });

    it("Should revert, if we try to support transaction proposal which is already supported", async () => {
      await multiSigWallet.connect(owner1).supportTransactionProposal(0);

      await expect(
        multiSigWallet.connect(owner1).supportTransactionProposal(0)
      ).to.be.revertedWith("Transaction already supported");
    });

    it("Should revert, if we try to support transaction proposal due to time expired", async () => {
      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner1).supportTransactionProposal(0)
      ).to.be.revertedWith("Time up!");
    });

    it("Should revert, if we try to support transaction proposal which is already executed", async () => {
      const tx = await owner1.sendTransaction({
        to: multiSigWalletAddress,
        value: ethers.utils.parseEther("1"),
      });

      await multiSigWallet.connect(owner1).supportTransactionProposal(0);

      await multiSigWallet.connect(owner2).supportTransactionProposal(0);

      await multiSigWallet.connect(owner3).supportTransactionProposal(0);

      await multiSigWallet.connect(owner4).supportTransactionProposal(0);

      await expect(
        multiSigWallet.connect(owner5).supportTransactionProposal(0)
      ).to.be.revertedWith("Transaction already executed");
    });

    it("Should be able to execute transaction by voting for ether transfer", async () => {
      const tx = await owner1.sendTransaction({
        to: multiSigWalletAddress,
        value: ethers.utils.parseEther("1"),
      });

      const initialBalance = await ethers.provider.getBalance(owner2Address);
      let contractBalance = await ethers.provider.getBalance(
        multiSigWalletAddress
      );
      expect(contractBalance).to.equal(ethers.utils.parseEther("1"));

      let transaction = await multiSigWallet.transactionProposals(0);
      expect(transaction["numberOfApprovals"]).to.equal(0);
      expect(transaction["executed"]).to.false;

      let owner1status = await multiSigWallet.supportTransaction(
        0,
        owner1Address
      );
      expect(owner1status).to.false;

      await multiSigWallet.connect(owner1).supportTransactionProposal(0);

      transaction = await multiSigWallet.transactionProposals(0);
      expect(transaction["numberOfApprovals"]).to.equal(1);

      owner1status = await multiSigWallet.supportTransaction(0, owner1Address);
      expect(owner1status).to.true;

      let owner2status = await multiSigWallet.supportTransaction(
        0,
        owner2Address
      );
      expect(owner2status).to.false;

      await multiSigWallet.connect(owner2).supportTransactionProposal(0);

      transaction = await multiSigWallet.transactionProposals(0);
      expect(transaction["numberOfApprovals"]).to.equal(2);

      owner2status = await multiSigWallet.supportTransaction(0, owner2Address);
      expect(owner2status).to.true;

      let owner3status = await multiSigWallet.supportTransaction(
        0,
        owner3Address
      );
      expect(owner3status).to.false;

      await multiSigWallet.connect(owner3).supportTransactionProposal(0);

      transaction = await multiSigWallet.transactionProposals(0);
      expect(transaction["numberOfApprovals"]).to.equal(3);

      owner3status = await multiSigWallet.supportTransaction(0, owner3Address);
      expect(owner3status).to.true;

      let owner4status = await multiSigWallet.supportTransaction(
        0,
        owner4Address
      );
      expect(owner4status).to.false;

      await multiSigWallet.connect(owner4).supportTransactionProposal(0);

      transaction = await multiSigWallet.transactionProposals(0);
      expect(transaction["numberOfApprovals"]).to.equal(4);
      expect(transaction["executed"]).to.true;

      owner4status = await multiSigWallet.supportTransaction(0, owner4Address);
      expect(owner4status).to.true;

      balance = await ethers.provider.getBalance(owner2Address);

      expect(balance).to.be.within(
        initialBalance,
        initialBalance.add(ethers.utils.parseEther("1"))
      );

      contractBalance = await ethers.provider.getBalance(multiSigWalletAddress);
      expect(contractBalance).to.equal(0);
    });

    it("Should revert to execute transaction by voting, if contract have enough ether balance", async () => {
      await multiSigWallet.connect(owner1).supportTransactionProposal(0);

      await multiSigWallet.connect(owner2).supportTransactionProposal(0);

      await multiSigWallet.connect(owner3).supportTransactionProposal(0);

      await expect(
        multiSigWallet.connect(owner4).supportTransactionProposal(0)
      ).to.be.revertedWith("Transaction failed");
    });
  });

  describe("Executing functions from another smart contracts", () => {
    it("Should be able to change a state variable using a function", async () => {
      const TestContractFactory = await ethers.getContractFactory(
        "TestContract"
      );
      const testContract = await TestContractFactory.deploy();
      await testContract.deployed();
      const testContractAddress = await testContract.address;

      const ABI = ["function callMe(uint256 j)"];
      const iface = new ethers.utils.Interface(ABI);
      const data = iface.encodeFunctionData("callMe", [123]);

      let i = await testContract.i();
      expect(i).to.equal(0);

      await multiSigWallet
        .connect(owner1)
        .submitTransactionProposal(testContractAddress, 0, data, 300);

      await multiSigWallet.connect(owner1).supportTransactionProposal(0);

      await multiSigWallet.connect(owner2).supportTransactionProposal(0);

      await multiSigWallet.connect(owner3).supportTransactionProposal(0);

      await multiSigWallet.connect(owner4).supportTransactionProposal(0);

      i = await testContract.i();
      expect(i).to.equal(123);
    });

    it("Should be able to transfer ERC20 token", async () => {
      const MyToken = await ethers.getContractFactory("MyToken");
      const myToken = await MyToken.deploy(
        "Test Token",
        "TT",
        ethers.utils.parseEther("100")
      );
      await myToken.deployed();
      const myTokenAddress = await myToken.address;

      await myToken.transfer(
        multiSigWalletAddress,
        ethers.utils.parseEther("100")
      );

      const ABI = ["function transfer(address to, uint256 amount)"];
      const iface = new ethers.utils.Interface(ABI);
      const data = iface.encodeFunctionData("transfer", [
        account1Address,
        ethers.utils.parseEther("100"),
      ]);

      let contractBalance = await myToken.balanceOf(multiSigWalletAddress);
      expect(contractBalance).to.equal(ethers.utils.parseEther("100"));

      let receiverBalance = await myToken.balanceOf(account1Address);
      expect(receiverBalance).to.equal(0);

      await multiSigWallet
        .connect(owner1)
        .submitTransactionProposal(myTokenAddress, 0, data, 300);

      await multiSigWallet.connect(owner1).supportTransactionProposal(0);

      await multiSigWallet.connect(owner2).supportTransactionProposal(0);

      await multiSigWallet.connect(owner3).supportTransactionProposal(0);

      await multiSigWallet.connect(owner4).supportTransactionProposal(0);

      contractBalance = await myToken.balanceOf(multiSigWalletAddress);
      receiverBalance = await myToken.balanceOf(account1Address);

      expect(contractBalance).to.equal(0);
      expect(receiverBalance).to.equal(ethers.utils.parseEther("100"));
    });

    it("Should be able to lazy mint an ERC721 token", async () => {
      const LazyMintNFT = await ethers.getContractFactory("LazyMintNFT");
      const lazyMintNFT = await LazyMintNFT.deploy("Lazy Mint", "LMINT");
      await lazyMintNFT.deployed();
      const lazyMintNFTAddress = await lazyMintNFT.address;

      const ABI = ["function lazyMint(address _to)"];
      const iface = new ethers.utils.Interface(ABI);
      const data = iface.encodeFunctionData("lazyMint", [account1Address]);

      let nftBalance = await lazyMintNFT.balanceOf(account1Address);
      expect(nftBalance).to.equal(0);

      await multiSigWallet
        .connect(owner1)
        .submitTransactionProposal(lazyMintNFTAddress, 0, data, 300);

      await multiSigWallet.connect(owner1).supportTransactionProposal(0);

      await multiSigWallet.connect(owner2).supportTransactionProposal(0);

      await multiSigWallet.connect(owner3).supportTransactionProposal(0);

      await multiSigWallet.connect(owner4).supportTransactionProposal(0);

      nftBalance = await lazyMintNFT.balanceOf(account1Address);
      expect(nftBalance).to.equal(1);

      const nftOwner = await lazyMintNFT.ownerOf(0);
      expect(nftOwner).to.equal(account1Address);
    });

    it("Should be able to burn an ERC721 token", async () => {
      const LazyMintNFT = await ethers.getContractFactory("LazyMintNFT");
      const lazyMintNFT = await LazyMintNFT.deploy("Lazy Mint", "LMINT");
      await lazyMintNFT.deployed();
      const lazyMintNFTAddress = await lazyMintNFT.address;

      let nftBalance = await lazyMintNFT.balanceOf(account1Address);
      expect(nftBalance).to.equal(0);

      await lazyMintNFT.lazyMint(account1Address);

      nftBalance = await lazyMintNFT.balanceOf(account1Address);
      expect(nftBalance).to.equal(1);

      let nftOwner = await lazyMintNFT.ownerOf(0);
      expect(nftOwner).to.equal(account1Address);

      const ABI = ["function burn(uint256 tokenId)"];
      const iface = new ethers.utils.Interface(ABI);
      const data = iface.encodeFunctionData("burn", [0]);

      await lazyMintNFT.connect(account1).approve(multiSigWalletAddress, 0);

      await multiSigWallet
        .connect(owner1)
        .submitTransactionProposal(lazyMintNFTAddress, 0, data, 300);

      await multiSigWallet.connect(owner1).supportTransactionProposal(0);

      await multiSigWallet.connect(owner2).supportTransactionProposal(0);

      await multiSigWallet.connect(owner3).supportTransactionProposal(0);

      await multiSigWallet.connect(owner4).supportTransactionProposal(0);

      nftBalance = await lazyMintNFT.balanceOf(account1Address);
      expect(nftBalance).to.equal(0);

      await expect(lazyMintNFT.ownerOf(0)).to.be.revertedWith(
        "ERC721: invalid token ID"
      );
    });
  });

  describe("Opposing a transaction proposal", () => {
    beforeEach(async () => {
      await multiSigWallet
        .connect(owner1)
        .submitTransactionProposal(
          owner2Address,
          ethers.utils.parseEther("1"),
          ethers.constants.HashZero,
          300
        );
    });

    it("Should be able to oppose a transaction proposal", async () => {
      let transaction = await multiSigWallet.transactionProposals(0);
      expect(transaction["numberOfApprovals"]).to.equal(0);

      let status = await multiSigWallet.supportTransaction(0, owner1Address);
      expect(status).to.false;

      await multiSigWallet.connect(owner1).supportTransactionProposal(0);

      transaction = await multiSigWallet.transactionProposals(0);
      expect(transaction["numberOfApprovals"]).to.equal(1);

      status = await multiSigWallet.supportTransaction(0, owner1Address);
      expect(status).to.true;

      await multiSigWallet.connect(owner1).opposeTransactionProposal(0);

      transaction = await multiSigWallet.transactionProposals(0);
      expect(transaction["numberOfApprovals"]).to.equal(0);

      status = await multiSigWallet.supportTransaction(0, owner1Address);
      expect(status).to.false;
    });

    it("Should revert if we tries to oppose a transaction proposal from a non-owner account", async () => {
      await multiSigWallet.connect(owner1).supportTransactionProposal(0);

      await expect(
        multiSigWallet.connect(account1).opposeTransactionProposal(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should revert if we tries to oppose a transaction proposal which does not exists", async () => {
      await expect(
        multiSigWallet.connect(owner1).opposeTransactionProposal(1)
      ).to.be.revertedWith("Transaction does not exists");
    });

    it("Should revert if we tries to oppose a transaction proposal which is already executed", async () => {
      const tx = await owner1.sendTransaction({
        to: multiSigWalletAddress,
        value: ethers.utils.parseEther("1"),
      });

      await multiSigWallet.connect(owner1).supportTransactionProposal(0);
      await multiSigWallet.connect(owner2).supportTransactionProposal(0);
      await multiSigWallet.connect(owner3).supportTransactionProposal(0);
      await multiSigWallet.connect(owner4).supportTransactionProposal(0);

      await expect(
        multiSigWallet.connect(owner1).opposeTransactionProposal(0)
      ).to.be.revertedWith("Transaction already executed");
    });

    it("Should revert if we tries to oppose a transaction proposal due to time expired", async () => {
      await multiSigWallet.connect(owner1).supportTransactionProposal(0);

      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner1).opposeTransactionProposal(0)
      ).to.be.revertedWith("Time up!");
    });

    it("Should revert if we tries to oppose a transaction proposal which is not supported before", async () => {
      await expect(
        multiSigWallet.connect(owner1).opposeTransactionProposal(0)
      ).to.be.revertedWith("Transaction not approved");
    });
  });

  describe("Adding an ownership candidate proposal", () => {
    it("Should be able to add an ownership candidate", async () => {
      let status = await multiSigWallet.isOwnershipCandidate(account1Address);
      expect(status).is.false;
      await multiSigWallet
        .connect(owner1)
        .addOwnerCandidate(account1Address, 300);

      const blockBeforeNumber = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockBeforeNumber);
      const startTime = blockBefore.timestamp;
      const endTime = startTime + 300;

      const candidate = await multiSigWallet.candidateProposals(0);
      expect(candidate["candidateAddress"]).to.equal(account1Address);
      expect(candidate["numberOfApprovals"]).to.equal(0);
      expect(candidate["startTime"]).to.equal(startTime);
      expect(candidate["endTime"]).to.equal(endTime);
      expect(candidate["selected"]).to.false;

      status = await multiSigWallet.isOwnershipCandidate(account1Address);
      expect(status).is.true;
    });

    it("Should revert to add an ownership candidate, because the function is called by a non-owner account", async () => {
      await expect(
        multiSigWallet.connect(account1).addOwnerCandidate(account1Address, 300)
      ).to.be.revertedWith("Not owner");
    });

    it("Should revert to add an ownership candidate, because the given address is a zero address", async () => {
      await expect(
        multiSigWallet
          .connect(owner1)
          .addOwnerCandidate(ethers.constants.AddressZero, 300)
      ).to.be.revertedWith("Zero address");
    });

    it("Should revert to add an ownership candidate, because the given address is already an owner", async () => {
      await expect(
        multiSigWallet.connect(owner1).addOwnerCandidate(owner5Address, 300)
      ).to.be.revertedWith("Already an owner");
    });

    it("Should revert to add an ownership candidate, because the given address is already an ownership candidate", async () => {
      await multiSigWallet
        .connect(owner1)
        .addOwnerCandidate(account1Address, 300);

      await expect(
        multiSigWallet.connect(owner1).addOwnerCandidate(account1Address, 300)
      ).to.be.revertedWith("Already a candidate for ownership");
    });

    it("Should revert to add an ownership candidate, due to 0 time duration", async () => {
      await expect(
        multiSigWallet.connect(owner1).addOwnerCandidate(account1Address, 0)
      ).to.be.revertedWith("Zero time duration");
    });
  });

  describe("Voting for an ownership candidate", () => {
    beforeEach(async () => {
      await multiSigWallet
        .connect(owner1)
        .addOwnerCandidate(account1Address, 300);
    });

    it("Should be able to vote for the candidate successfully", async () => {
      let status = await multiSigWallet.supportCandidate(0, owner1Address);
      expect(status).to.false;

      let candidate = await multiSigWallet.candidateProposals(0);
      expect(candidate["numberOfApprovals"]).to.equal(0);

      await multiSigWallet.connect(owner1).voteCandidate(0);

      status = await multiSigWallet.supportCandidate(0, owner1Address);
      expect(status).to.true;

      candidate = await multiSigWallet.candidateProposals(0);
      expect(candidate["numberOfApprovals"]).to.equal(1);
    });

    it("Should revert if tried to vote for a candidate from a non-owner account", async () => {
      await expect(
        multiSigWallet.connect(account1).voteCandidate(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should revert if tried to vote for a candidate proposal which does not exists", async () => {
      await expect(
        multiSigWallet.connect(owner1).voteCandidate(1)
      ).to.be.revertedWith("Candidate does not exists");
    });

    it("Should revert if tried to vote for a candidate which is already supported", async () => {
      await multiSigWallet.connect(owner1).voteCandidate(0);

      await expect(
        multiSigWallet.connect(owner1).voteCandidate(0)
      ).to.be.revertedWith("Candidate already supported");
    });

    it("Should revert if tried to vote for a candidate which is already got elected", async () => {
      await multiSigWallet.connect(owner1).voteCandidate(0);
      await multiSigWallet.connect(owner2).voteCandidate(0);
      await multiSigWallet.connect(owner3).voteCandidate(0);
      await multiSigWallet.connect(owner4).voteCandidate(0);

      await expect(
        multiSigWallet.connect(owner5).voteCandidate(0)
      ).to.be.revertedWith("Candidate already elected");
    });

    it("Should revert if tried to vote for a candidate proposal, because time expired", async () => {
      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner1).voteCandidate(0)
      ).to.be.revertedWith("Time up!");
    });

    it("Should change the required votes if enough number of owners are elected", async () => {
      let requiredVotes = await multiSigWallet.requiredVotes();
      expect(requiredVotes).to.equal(4);

      await multiSigWallet.connect(owner1).voteCandidate(0);
      await multiSigWallet.connect(owner2).voteCandidate(0);
      await multiSigWallet.connect(owner3).voteCandidate(0);
      await multiSigWallet.connect(owner4).voteCandidate(0);

      await multiSigWallet
        .connect(owner1)
        .addOwnerCandidate(account2Address, 300);

      await multiSigWallet.connect(owner1).voteCandidate(1);
      await multiSigWallet.connect(owner2).voteCandidate(1);
      await multiSigWallet.connect(owner3).voteCandidate(1);
      await multiSigWallet.connect(owner4).voteCandidate(1);

      requiredVotes = await multiSigWallet.requiredVotes();
      expect(requiredVotes).to.equal(5);
    });
  });

  describe("Rejecting an ownership candidate", () => {
    beforeEach(async () => {
      await multiSigWallet
        .connect(owner1)
        .addOwnerCandidate(account1Address, 300);
    });

    it("Should be able to reject an ownership candidate successfully", async () => {
      let status = await multiSigWallet.supportCandidate(0, owner1Address);
      expect(status).to.false;

      let candidate = await multiSigWallet.candidateProposals(0);
      expect(candidate["numberOfApprovals"]).to.equal(0);

      await multiSigWallet.connect(owner1).voteCandidate(0);

      status = await multiSigWallet.supportCandidate(0, owner1Address);
      expect(status).to.true;

      candidate = await multiSigWallet.candidateProposals(0);
      expect(candidate["numberOfApprovals"]).to.equal(1);

      await multiSigWallet.connect(owner1).rejectCandidate(0);

      status = await multiSigWallet.supportCandidate(0, owner1Address);
      expect(status).to.false;

      candidate = await multiSigWallet.candidateProposals(0);
      expect(candidate["numberOfApprovals"]).to.equal(0);
    });

    it("Should revert if tried to execute this function from a non-owner account", async () => {
      await expect(
        multiSigWallet.connect(account1).rejectCandidate(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should revert if tried to to reject an ownership candidate which does not exists", async () => {
      await multiSigWallet.connect(owner1).voteCandidate(0);
      await expect(
        multiSigWallet.connect(owner1).rejectCandidate(1)
      ).to.be.revertedWith("Candidate does not exists");
    });

    it("Should revert if tried to to reject an ownership candidate which already got elected", async () => {
      await multiSigWallet.connect(owner1).voteCandidate(0);
      await multiSigWallet.connect(owner2).voteCandidate(0);
      await multiSigWallet.connect(owner3).voteCandidate(0);
      await multiSigWallet.connect(owner4).voteCandidate(0);
      await expect(
        multiSigWallet.connect(owner1).rejectCandidate(0)
      ).to.be.revertedWith("Candidate already elected");
    });

    it("Should revert if tried to to reject an ownership candidate, due to time expired", async () => {
      await multiSigWallet.connect(owner1).voteCandidate(0);

      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner1).rejectCandidate(0)
      ).to.be.revertedWith("Time up!");
    });

    it("Should revert if tried to to reject an ownership candidate, because we haven't supported them before", async () => {
      await expect(
        multiSigWallet.connect(owner1).rejectCandidate(0)
      ).to.be.revertedWith("Candidate not approved");
    });
  });

  describe("Submitting an ownership removal proposal", () => {
    it("Should be able to submit ownership removal proposal successfully", async () => {
      let status = await multiSigWallet.isOwnershipRemovalCandidate(
        owner5Address
      );
      expect(status).is.false;

      await multiSigWallet
        .connect(owner1)
        .removeOwnerProposal(owner5Address, 300);

      const blockBeforeNumber = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockBeforeNumber);
      const startTime = blockBefore.timestamp;
      const endTime = startTime + 300;

      const proposal = await multiSigWallet.removalProposals(0);
      expect(proposal["ownerAddress"]).to.equal(owner5Address);
      expect(proposal["numberOfApprovals"]).to.equal(0);
      expect(proposal["startTime"]).to.equal(startTime);
      expect(proposal["endTime"]).to.equal(endTime);
      expect(proposal["removed"]).is.false;

      status = await multiSigWallet.isOwnershipRemovalCandidate(owner5Address);
      expect(status).is.true;
    });

    it("Should revert, if tried to execute from a non-owner account", async () => {
      await expect(
        multiSigWallet.connect(account1).removeOwnerProposal(owner5Address, 300)
      ).to.be.revertedWith("Not owner");
    });

    it("Should revert, if tried to remove an account from owners list, which is not an owner", async () => {
      await expect(
        multiSigWallet.connect(owner1).removeOwnerProposal(account1Address, 300)
      ).to.be.revertedWith("Not an owner");
    });

    it("Should revert, if tried to remove an account from owners list, which is already under removal proposal", async () => {
      await multiSigWallet
        .connect(owner1)
        .removeOwnerProposal(owner5Address, 300);

      await expect(
        multiSigWallet.connect(owner1).removeOwnerProposal(owner5Address, 300)
      ).to.be.revertedWith("Already a candidate for ownership removal");
    });

    it("Should revert, because of 0 time duration", async () => {
      await expect(
        multiSigWallet.connect(owner1).removeOwnerProposal(owner5Address, 0)
      ).to.be.revertedWith("Zero time duration");
    });
  });

  describe("Voting for a removal proposal", () => {
    beforeEach(async () => {
      await multiSigWallet
        .connect(owner1)
        .removeOwnerProposal(owner5Address, 300);
    });

    it("Should be able to vote for a ownership removal proposal", async () => {
      let proposal = await multiSigWallet.removalProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(0);

      let status = await multiSigWallet.supportRemoval(0, owner1Address);
      expect(status).is.false;

      await multiSigWallet.connect(owner1).supportRemovalProposal(0);

      proposal = await multiSigWallet.removalProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(1);

      status = await multiSigWallet.supportRemoval(0, owner1Address);
      expect(status).is.true;
    });

    it("Should revert, if a non-owner account tries to vote for a ownership removal proposal", async () => {
      await expect(
        multiSigWallet.connect(account1).supportRemovalProposal(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should revert, if removal proposal doesn't exists", async () => {
      await expect(
        multiSigWallet.connect(owner1).supportRemovalProposal(1)
      ).to.be.revertedWith("Removal proposal does not exists");
    });

    it("Should revert, if voting for removal proposal more than once", async () => {
      await multiSigWallet.connect(owner1).supportRemovalProposal(0);

      await expect(
        multiSigWallet.connect(owner1).supportRemovalProposal(0)
      ).to.be.revertedWith("Removal proposal already approved");
    });

    it("Should revert, if a ownership removal proposal is already executed, and owenr is removed", async () => {
      await multiSigWallet.connect(owner1).supportRemovalProposal(0);
      await multiSigWallet.connect(owner2).supportRemovalProposal(0);
      await multiSigWallet.connect(owner3).supportRemovalProposal(0);
      await multiSigWallet.connect(owner4).supportRemovalProposal(0);
      await expect(
        multiSigWallet.connect(owner6).supportRemovalProposal(0)
      ).to.be.revertedWith("Owner already removed");
    });

    it("Should revert, due to time expired", async () => {
      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner1).supportRemovalProposal(0)
      ).to.be.revertedWith("Time up!");
    });

    it("Should change required votes, if enough number of owners are removed", async () => {
      let requiredVotes = await multiSigWallet.requiredVotes();
      expect(requiredVotes).to.equal(4);

      await multiSigWallet.connect(owner1).supportRemovalProposal(0);
      await multiSigWallet.connect(owner2).supportRemovalProposal(0);
      await multiSigWallet.connect(owner3).supportRemovalProposal(0);
      await multiSigWallet.connect(owner4).supportRemovalProposal(0);

      await multiSigWallet
        .connect(owner1)
        .removeOwnerProposal(owner6Address, 300);

      await multiSigWallet.connect(owner1).supportRemovalProposal(1);
      await multiSigWallet.connect(owner2).supportRemovalProposal(1);
      await multiSigWallet.connect(owner3).supportRemovalProposal(1);
      await multiSigWallet.connect(owner4).supportRemovalProposal(1);

      requiredVotes = await multiSigWallet.requiredVotes();
      expect(requiredVotes).to.equal(3);
    });
  });

  describe("Opposing an ownership removal proposal", () => {
    beforeEach(async () => {
      await multiSigWallet
        .connect(owner1)
        .removeOwnerProposal(owner5Address, 300);
    });

    it("Should be able to oppose an ownership removal proposal successfully", async () => {
      let proposal = await multiSigWallet.removalProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(0);

      let status = await multiSigWallet.supportRemoval(0, owner1Address);
      expect(status).is.false;

      await multiSigWallet.connect(owner1).supportRemovalProposal(0);

      proposal = await multiSigWallet.removalProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(1);

      status = await multiSigWallet.supportRemoval(0, owner1Address);
      expect(status).is.true;

      await multiSigWallet.connect(owner1).opposeRemovalProposal(0);

      proposal = await multiSigWallet.removalProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(0);

      status = await multiSigWallet.supportRemoval(0, owner1Address);
      expect(status).is.false;
    });

    it("Should revert, if tried to oppose an ownership removal proposal from a non-owner account", async () => {
      await multiSigWallet.connect(owner1).supportRemovalProposal(0);

      await expect(
        multiSigWallet.connect(account1).opposeRemovalProposal(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should revert, because ownership removal proposal doesn't exist", async () => {
      await multiSigWallet.connect(owner1).supportRemovalProposal(0);

      await expect(
        multiSigWallet.connect(owner1).opposeRemovalProposal(1)
      ).to.be.revertedWith("Removal proposal does not exists");
    });

    it("Should revert, because ownership removal proposal already executed, and owner is removed", async () => {
      await multiSigWallet.connect(owner1).supportRemovalProposal(0);
      await multiSigWallet.connect(owner2).supportRemovalProposal(0);
      await multiSigWallet.connect(owner3).supportRemovalProposal(0);
      await multiSigWallet.connect(owner4).supportRemovalProposal(0);

      await expect(
        multiSigWallet.connect(owner1).opposeRemovalProposal(0)
      ).to.be.revertedWith("Owner already removed");
    });

    it("Should revert, because time expired", async () => {
      await multiSigWallet.connect(owner1).supportRemovalProposal(0);

      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner1).opposeRemovalProposal(0)
      ).to.be.revertedWith("Time up!");
    });

    it("Should revert, because ownership removal proposal have not supported before", async () => {
      await expect(
        multiSigWallet.connect(owner1).opposeRemovalProposal(0)
      ).to.be.revertedWith("Ownership removal not approved");
    });
  });

  describe("Adding new required number of votes", () => {
    it("Should be able to add new required number votes", async () => {
      await multiSigWallet.connect(owner1).addNewRequiredVotes(5, 300);

      const blockBeforeNumber = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockBeforeNumber);
      const startTime = blockBefore.timestamp;
      const endTime = startTime + 300;

      const proposal = await multiSigWallet.requiredVotesProposals(0);
      expect(proposal["newRequiredVotes"]).to.equal(5);
      expect(proposal["numberOfApprovals"]).to.equal(0);
      expect(proposal["startTime"]).to.equal(startTime);
      expect(proposal["endTime"]).to.equal(endTime);
      expect(proposal["changed"]).is.false;
    });

    it("Should revert, if tried to execute the function from a non-owner account", async () => {
      await expect(
        multiSigWallet.connect(account1).addNewRequiredVotes(5, 300)
      ).to.be.revertedWith("Not owner");
    });

    it("Should revert, if newly proposed required votes is same as the current", async () => {
      await expect(
        multiSigWallet.connect(owner1).addNewRequiredVotes(4, 300)
      ).to.be.revertedWith("Already the same required votes");
    });

    it("Should revert, if newly proposed required votes is invalid", async () => {
      await expect(
        multiSigWallet.connect(owner1).addNewRequiredVotes(6, 300)
      ).to.be.revertedWith("Invalid number of required votes");
    });

    it("Should revert, if 0 time duration", async () => {
      await expect(
        multiSigWallet.connect(owner1).addNewRequiredVotes(5, 0)
      ).to.be.revertedWith("Zero time duration");
    });
  });

  describe("Supporting the proposal for the newly required number of votes", () => {
    beforeEach(async () => {
      await multiSigWallet.connect(owner1).addNewRequiredVotes(5, 300);
    });

    it("Should be able to vote for the proposal for the newly required number of votes", async () => {
      let proposal = await multiSigWallet.requiredVotesProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(0);
      let status = await multiSigWallet.supportRequiredVotes(0, owner1Address);
      expect(status).is.false;

      await multiSigWallet.connect(owner1).supportNewRequiredVotes(0);

      proposal = await multiSigWallet.requiredVotesProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(1);
      status = await multiSigWallet.supportRequiredVotes(0, owner1Address);
      expect(status).is.true;
    });

    it("Should revert if tried to execute the function from a non-owner account", async () => {
      await expect(
        multiSigWallet.connect(account1).supportNewRequiredVotes(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should revert if the proposal for the newly required number of votes doesn't exist", async () => {
      await expect(
        multiSigWallet.connect(owner1).supportNewRequiredVotes(1)
      ).to.be.revertedWith("New required votes proposal does not exists");
    });

    it("Should revert if voted for the proposal for the newly required number of votes", async () => {
      await multiSigWallet.connect(owner1).supportNewRequiredVotes(0);

      await expect(
        multiSigWallet.connect(owner1).supportNewRequiredVotes(0)
      ).to.be.revertedWith("New required votes proposal already approved");
    });

    it("Should revert if voted for the proposal for the newly required number of votes, which is already selected", async () => {
      await multiSigWallet.connect(owner1).supportNewRequiredVotes(0);
      await multiSigWallet.connect(owner2).supportNewRequiredVotes(0);
      await multiSigWallet.connect(owner3).supportNewRequiredVotes(0);
      await multiSigWallet.connect(owner4).supportNewRequiredVotes(0);

      await expect(
        multiSigWallet.connect(owner5).supportNewRequiredVotes(0)
      ).to.be.revertedWith("Required votes proposal already changed");
    });

    it("Should revert, because time expired", async () => {
      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner1).supportNewRequiredVotes(0)
      ).to.be.revertedWith("Time up!");
    });
  });

  describe("Opposing the proposal for a new required number of votes", () => {
    beforeEach(async () => {
      await multiSigWallet.connect(owner1).addNewRequiredVotes(5, 300);
    });

    it("Should be able to oppose proposal for the new required number of votes", async () => {
      let proposal = await multiSigWallet.requiredVotesProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(0);
      let status = await multiSigWallet.supportRequiredVotes(0, owner1Address);
      expect(status).is.false;

      await multiSigWallet.connect(owner1).supportNewRequiredVotes(0);

      proposal = await multiSigWallet.requiredVotesProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(1);
      status = await multiSigWallet.supportRequiredVotes(0, owner1Address);
      expect(status).is.true;

      await multiSigWallet.connect(owner1).opposeNewRequiredVotes(0);

      proposal = await multiSigWallet.requiredVotesProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(0);
      status = await multiSigWallet.supportRequiredVotes(0, owner1Address);
      expect(status).is.false;
    });

    it("Should revert, due to call from a non-owner account", async () => {
      await multiSigWallet.connect(owner1).supportNewRequiredVotes(0);

      await expect(
        multiSigWallet.connect(account1).opposeNewRequiredVotes(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should revert, because proposal for the new required number of votes doesn't exist", async () => {
      await multiSigWallet.connect(owner1).supportNewRequiredVotes(0);

      await expect(
        multiSigWallet.connect(owner1).opposeNewRequiredVotes(1)
      ).to.be.revertedWith("New required votes proposal does not exists");
    });

    it("Should revert, because proposal for the new required number of votes is already executed", async () => {
      await multiSigWallet.connect(owner1).supportNewRequiredVotes(0);
      await multiSigWallet.connect(owner2).supportNewRequiredVotes(0);
      await multiSigWallet.connect(owner3).supportNewRequiredVotes(0);
      await multiSigWallet.connect(owner4).supportNewRequiredVotes(0);

      await expect(
        multiSigWallet.connect(owner1).opposeNewRequiredVotes(0)
      ).to.be.revertedWith("Required votes proposal already changed");
    });

    it("Should revert, due to time expired", async () => {
      await multiSigWallet.connect(owner1).supportNewRequiredVotes(0);

      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner1).opposeNewRequiredVotes(0)
      ).to.be.revertedWith("Time up!");
    });

    it("Should revert, because proposal for the new required number of votes haven't supported previously", async () => {
      await expect(
        multiSigWallet.connect(owner1).opposeNewRequiredVotes(0)
      ).to.be.revertedWith("New required votes proposal not approved");
    });
  });
});
