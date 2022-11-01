const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("MultiSigWallet.sol", () => {
  let MultiSigWalletFactory, multiSigWallet, multiSigWalletAddress;

  let TestContractFactory, testContract, testContractAddress;

  let TestERC20, testERC20, testERC20Address;

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

    TestContractFactory = await ethers.getContractFactory("TestContract");
    testContract = await TestContractFactory.deploy();
    await testContract.deployed();
    testContractAddress = await testContract.address;

    TestERC20 = await ethers.getContractFactory("TestERC20");
    testERC20 = await TestERC20.deploy(
      "Test Token",
      "TT",
      ethers.utils.parseEther("1000")
    );
    await testERC20.deployed();
    testERC20Address = await testERC20.address;

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
      let reqVotes = await multiSigWallet.required();
      expect(reqVotes).to.equal(4);
    });
  });

  describe("Setup errors", () => {
    it("Should revert if the array of owners is empty", async () => {
      const MultiSigWalletError = await ethers.getContractFactory(
        "MultiSigWallet"
      );
      await expect(MultiSigWalletError.deploy([], 4)).to.be.revertedWith(
        "Owners required"
      );
    });

    it("Should revert if the invalid number of votes is invalid", async () => {
      const MultiSigWalletError = await ethers.getContractFactory(
        "MultiSigWallet"
      );
      await expect(
        MultiSigWalletError.deploy(
          [owner1Address, owner2Address, owner3Address, owner4Address],
          1
        )
      ).to.be.revertedWith("Invalid number of required votes");
    });

    it("Should revert if any of the owners is a zero address", async () => {
      const MultiSigWalletError = await ethers.getContractFactory(
        "MultiSigWallet"
      );
      await expect(
        MultiSigWalletError.deploy(
          [
            ethers.constants.AddressZero,
            owner2Address,
            owner3Address,
            owner4Address,
          ],
          3
        )
      ).to.be.revertedWith("Invalid address");
    });

    it("Should revert if any of the addresses in owners list is got repeated", async () => {
      const MultiSigWalletError = await ethers.getContractFactory(
        "MultiSigWallet"
      );
      await expect(
        MultiSigWalletError.deploy(
          [owner1Address, owner2Address, owner1Address, owner4Address],
          3
        )
      ).to.be.revertedWith("Owner is not unique");
    });
  });

  describe("Signing the transaction of ether transfer from one account to another", () => {
    beforeEach(async () => {
      const tx = await owner1.sendTransaction({
        to: multiSigWalletAddress,
        value: ethers.utils.parseEther("1"),
      });

      await multiSigWallet
        .connect(owner1)
        .submitTransaction(
          owner2Address,
          ethers.utils.parseEther("1"),
          "0x0000000000000000000000000000000000000000",
          300
        );
    });

    it("Should fail if submitting a transaction is done by an account which is not an owner", async () => {
      await expect(
        multiSigWallet
          .connect(account1)
          .submitTransaction(
            owner2Address,
            ethers.utils.parseEther("1"),
            "0x0000000000000000000000000000000000000000",
            300
          )
      ).to.be.revertedWith("Not owner");
    });

    it("Should fail if submitting a transaction zero time duration", async () => {
      await expect(
        multiSigWallet
          .connect(owner1)
          .submitTransaction(
            owner2Address,
            ethers.utils.parseEther("1"),
            "0x0000000000000000000000000000000000000000",
            0
          )
      ).to.be.revertedWith("Zero time duration");
    });

    it("Should successfully send ether", async () => {
      const initialBalance = await ethers.provider.getBalance(owner2Address);
      let contractBalance = await ethers.provider.getBalance(
        multiSigWalletAddress
      );
      expect(contractBalance).to.equal(ethers.utils.parseEther("1"));

      let transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(0);
      expect(transaction["executed"]).to.false;

      let status = await multiSigWallet.approved(0, owner1Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner1).confirmTransaction(0);
      status = await multiSigWallet.approved(0, owner1Address);
      expect(status).to.true;

      transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(1);

      status = await multiSigWallet.approved(0, owner2Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner2).confirmTransaction(0);
      status = await multiSigWallet.approved(0, owner2Address);
      expect(status).to.true;

      transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(2);

      status = await multiSigWallet.approved(0, owner3Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner3).confirmTransaction(0);
      status = await multiSigWallet.approved(0, owner3Address);
      expect(status).to.true;

      transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(3);

      status = await multiSigWallet.approved(0, owner4Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner4).confirmTransaction(0);
      status = await multiSigWallet.approved(0, owner4Address);
      expect(status).to.true;

      transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(4);
      expect(transaction["executed"]).to.true;

      balance = await ethers.provider.getBalance(owner2Address);

      expect(balance).to.be.within(
        initialBalance,
        initialBalance.add(ethers.utils.parseEther("1"))
      );

      contractBalance = await ethers.provider.getBalance(multiSigWalletAddress);
      expect(contractBalance).to.equal(0);
    });

    it("Should fail if supporting a transaction is done by an account which is not an owner", async () => {
      await expect(
        multiSigWallet.connect(account1).confirmTransaction(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should fail if supporting a transaction which does not exists", async () => {
      await expect(
        multiSigWallet.connect(owner1).confirmTransaction(1)
      ).to.be.revertedWith("Tx does not exists");
    });

    it("Should fail if supporting a transaction which that account already supported previously", async () => {
      await multiSigWallet.connect(owner1).confirmTransaction(0);

      await expect(
        multiSigWallet.connect(owner1).confirmTransaction(0)
      ).to.be.revertedWith("Tx already approved");
    });

    it("Should fail if supporting a transaction which is already executed", async () => {
      await multiSigWallet.connect(owner1).confirmTransaction(0);

      await multiSigWallet.connect(owner2).confirmTransaction(0);

      await multiSigWallet.connect(owner3).confirmTransaction(0);

      await multiSigWallet.connect(owner4).confirmTransaction(0);

      await expect(
        multiSigWallet.connect(owner5).confirmTransaction(0)
      ).to.be.revertedWith("Tx already executed");
    });

    it("Should fail the ether transfer due to time up", async () => {
      await multiSigWallet.connect(owner1).confirmTransaction(0);

      await multiSigWallet.connect(owner2).confirmTransaction(0);

      await multiSigWallet.connect(owner3).confirmTransaction(0);

      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner4).confirmTransaction(0)
      ).to.be.revertedWith("Time up!");
    });

    it("Should revoke support for a transaction", async () => {
      let transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(0);

      let status = await multiSigWallet.approved(0, owner1Address);
      expect(status).to.false;

      await multiSigWallet.connect(owner1).confirmTransaction(0);

      status = await multiSigWallet.approved(0, owner1Address);
      expect(status).to.true;

      transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(1);

      await multiSigWallet.connect(owner1).revokeConfirmation(0);

      status = await multiSigWallet.approved(0, owner1Address);
      expect(status).to.false;

      transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(0);
    });

    it("Should fail if revoking support for a transaction is done by an account which is not an owner", async () => {
      await expect(
        multiSigWallet.connect(account1).revokeConfirmation(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should fail if revoking support for a transaction which does not exists", async () => {
      await expect(
        multiSigWallet.connect(owner1).revokeConfirmation(1)
      ).to.be.revertedWith("Tx does not exists");
    });

    it("Should fail if revoking support for a transaction which is already executed", async () => {
      await multiSigWallet.connect(owner1).confirmTransaction(0);

      await multiSigWallet.connect(owner2).confirmTransaction(0);

      await multiSigWallet.connect(owner3).confirmTransaction(0);

      await multiSigWallet.connect(owner4).confirmTransaction(0);

      await expect(
        multiSigWallet.connect(owner4).revokeConfirmation(0)
      ).to.be.revertedWith("Tx already executed");
    });

    it("Should fail to revoke support method due to not supporing before", async () => {
      await expect(
        multiSigWallet.connect(owner1).revokeConfirmation(0)
      ).to.be.revertedWith("Tx not approved");
    });

    it("Should fail to revoke support method due to time up", async () => {
      await multiSigWallet.connect(owner1).confirmTransaction(0);

      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner1).revokeConfirmation(0)
      ).to.be.revertedWith("Time up!");
    });

    it("Should fail the ether transfer due to less balance", async () => {
      await multiSigWallet
        .connect(owner1)
        .submitTransaction(
          owner2Address,
          ethers.utils.parseEther("1.5"),
          "0x0000000000000000000000000000000000000000",
          300
        );

      await multiSigWallet.connect(owner1).confirmTransaction(1);

      await multiSigWallet.connect(owner2).confirmTransaction(1);

      await multiSigWallet.connect(owner3).confirmTransaction(1);

      await expect(
        multiSigWallet.connect(owner4).confirmTransaction(1)
      ).to.be.revertedWith("Tx failed");
    });
  });

  describe("Signing the execution of a function from another contract", () => {
    it("Should successfully change the value of the state variable i", async () => {
      let i = await testContract.i();
      expect(i).to.equal(0);

      const data = await testContract.getData(123);
      await multiSigWallet
        .connect(owner1)
        .submitTransaction(testContractAddress, 0, data, 300);

      let transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(0);
      expect(transaction["executed"]).to.false;

      let status = await multiSigWallet.approved(0, owner1Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner1).confirmTransaction(0);
      status = await multiSigWallet.approved(0, owner1Address);
      expect(status).to.true;

      transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(1);

      status = await multiSigWallet.approved(0, owner2Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner2).confirmTransaction(0);
      status = await multiSigWallet.approved(0, owner2Address);
      expect(status).to.true;

      transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(2);

      status = await multiSigWallet.approved(0, owner3Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner3).confirmTransaction(0);
      status = await multiSigWallet.approved(0, owner3Address);
      expect(status).to.true;

      transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(3);

      status = await multiSigWallet.approved(0, owner4Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner4).confirmTransaction(0);
      status = await multiSigWallet.approved(0, owner4Address);
      expect(status).to.true;

      transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(4);
      expect(transaction["executed"]).to.true;

      i = await testContract.i();
      expect(i).to.equal(123);
    });
  });

  describe("Signing of token transfer to one account", () => {
    beforeEach(async () => {
      await testERC20.setBalance(owner1Address, ethers.utils.parseEther("100"));
      await testERC20.transfer(
        multiSigWalletAddress,
        ethers.utils.parseEther("100")
      );
    });

    it("Should transfer token to the receiver", async () => {
      let contractBalance = await testERC20.balanceOf(multiSigWalletAddress);
      let receiverBalance = await testERC20.balanceOf(account1Address);

      expect(contractBalance).to.equal(ethers.utils.parseEther("100"));
      expect(receiverBalance).to.equal(0);

      const data = await testERC20.getData(
        account1Address,
        ethers.utils.parseEther("100")
      );

      await multiSigWallet
        .connect(owner1)
        .submitTransaction(testERC20Address, 0, data, 300);

      let transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(0);
      expect(transaction["executed"]).to.false;

      let status = await multiSigWallet.approved(0, owner1Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner1).confirmTransaction(0);
      status = await multiSigWallet.approved(0, owner1Address);
      expect(status).to.true;

      transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(1);

      status = await multiSigWallet.approved(0, owner2Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner2).confirmTransaction(0);
      status = await multiSigWallet.approved(0, owner2Address);
      expect(status).to.true;

      transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(2);

      status = await multiSigWallet.approved(0, owner3Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner3).confirmTransaction(0);
      status = await multiSigWallet.approved(0, owner3Address);
      expect(status).to.true;

      transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(3);

      status = await multiSigWallet.approved(0, owner4Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner4).confirmTransaction(0);
      status = await multiSigWallet.approved(0, owner4Address);
      expect(status).to.true;

      transaction = await multiSigWallet.transactions(0);
      expect(transaction["numberOfApprovals"]).to.equal(4);
      expect(transaction["executed"]).to.true;

      contractBalance = await testERC20.balanceOf(multiSigWalletAddress);
      receiverBalance = await testERC20.balanceOf(account1Address);

      expect(contractBalance).to.equal(0);
      expect(receiverBalance).to.equal(ethers.utils.parseEther("100"));
    });
  });

  describe("Signing the inclusion of a new owner", () => {
    beforeEach(async () => {
      await multiSigWallet
        .connect(owner1)
        .addOwnerCandidate(account1Address, 300);
    });

    it("Should fail, if the inclusion request is done by an account which is not an owner", async () => {
      await expect(
        multiSigWallet.connect(account1).addOwnerCandidate(account2Address, 300)
      ).to.be.revertedWith("Not owner");
    });

    it("Should fail, if request is for including an account which is already an owner", async () => {
      await expect(
        multiSigWallet.connect(owner1).addOwnerCandidate(owner2Address, 300)
      ).to.be.revertedWith("Already an owner");
    });

    it("Should fail, if request is having zero time duration", async () => {
      await expect(
        multiSigWallet.connect(owner1).addOwnerCandidate(account2Address, 0)
      ).to.be.revertedWith("Zero time duration");
    });

    it("Should include the new account into the owner's list", async () => {
      let ownershipStatus = await multiSigWallet.isOwner(account1Address);
      expect(ownershipStatus).to.false;

      let candidate = await multiSigWallet.candidates(0);
      expect(candidate["numberOfApprovals"]).to.equal(0);
      expect(candidate["selected"]).to.false;

      let status = await multiSigWallet.supportCandidate(0, owner1Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner1).voteCandidate(0);
      status = await multiSigWallet.supportCandidate(0, owner1Address);
      expect(status).to.true;

      candidate = await multiSigWallet.candidates(0);
      expect(candidate["numberOfApprovals"]).to.equal(1);

      status = await multiSigWallet.supportCandidate(0, owner2Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner2).voteCandidate(0);
      status = await multiSigWallet.supportCandidate(0, owner2Address);
      expect(status).to.true;

      candidate = await multiSigWallet.candidates(0);
      expect(candidate["numberOfApprovals"]).to.equal(2);

      status = await multiSigWallet.supportCandidate(0, owner3Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner3).voteCandidate(0);
      status = await multiSigWallet.supportCandidate(0, owner3Address);
      expect(status).to.true;

      candidate = await multiSigWallet.candidates(0);
      expect(candidate["numberOfApprovals"]).to.equal(3);

      status = await multiSigWallet.supportCandidate(0, owner4Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner4).voteCandidate(0);
      status = await multiSigWallet.supportCandidate(0, owner4Address);
      expect(status).to.true;

      candidate = await multiSigWallet.candidates(0);
      expect(candidate["numberOfApprovals"]).to.equal(4);
      expect(candidate["selected"]).to.true;

      const address = await multiSigWallet.owners(6);
      expect(address).to.equal(account1Address);

      ownershipStatus = await multiSigWallet.isOwner(account1Address);
      expect(ownershipStatus).to.true;
    });

    it("Should increase required votes while including the new account into the owner's list", async () => {
      let reqVotes = await multiSigWallet.required();
      expect(reqVotes).to.equal(4);

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

      reqVotes = await multiSigWallet.required();
      expect(reqVotes).to.equal(5);
    });

    it("Should fail to supporting a candidate, if it is done by an account which is not an owner", async () => {
      await expect(
        multiSigWallet.connect(account2).voteCandidate(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should fail to supporting a candidate, which does not exists", async () => {
      await expect(
        multiSigWallet.connect(owner1).voteCandidate(1)
      ).to.be.revertedWith("Candidate does not exists");
    });

    it("Should fail to supporting a candidate, which that account already supported", async () => {
      await multiSigWallet.connect(owner1).voteCandidate(0);
      await expect(
        multiSigWallet.connect(owner1).voteCandidate(0)
      ).to.be.revertedWith("Candidate already approved");
    });

    it("Should fail to supporting a candidate, which is already made as an owner", async () => {
      await multiSigWallet.connect(owner1).voteCandidate(0);

      await multiSigWallet.connect(owner2).voteCandidate(0);

      await multiSigWallet.connect(owner3).voteCandidate(0);

      await multiSigWallet.connect(owner4).voteCandidate(0);

      await expect(
        multiSigWallet.connect(owner5).voteCandidate(0)
      ).to.be.revertedWith("Candidate already elected");
    });

    it("Should fail voting for a new owner candidate due to time up", async () => {
      await multiSigWallet.connect(owner1).voteCandidate(0);

      await multiSigWallet.connect(owner2).voteCandidate(0);

      await multiSigWallet.connect(owner3).voteCandidate(0);

      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner4).voteCandidate(0)
      ).to.be.revertedWith("Time up!");
    });

    it("Should revoke support for a new owner candidate", async () => {
      let candidate = await multiSigWallet.candidates(0);
      expect(candidate["numberOfApprovals"]).to.equal(0);

      let status = await multiSigWallet.supportCandidate(0, owner1Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner1).voteCandidate(0);
      status = await multiSigWallet.supportCandidate(0, owner1Address);
      expect(status).to.true;

      candidate = await multiSigWallet.candidates(0);
      expect(candidate["numberOfApprovals"]).to.equal(1);

      await multiSigWallet.connect(owner1).revokeVote(0);

      status = await multiSigWallet.supportCandidate(0, owner1Address);
      expect(status).to.false;

      candidate = await multiSigWallet.candidates(0);
      expect(candidate["numberOfApprovals"]).to.equal(0);
    });

    it("Should fail to revoke support for a candidate, if it is done by an account which is not an owner", async () => {
      await expect(
        multiSigWallet.connect(account2).revokeVote(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should fail to revert support for a candidate, which does not exists", async () => {
      await expect(
        multiSigWallet.connect(owner1).revokeVote(1)
      ).to.be.revertedWith("Candidate does not exists");
    });

    it("Should fail to revert support for a candidate, which is already made as an owner", async () => {
      await multiSigWallet.connect(owner1).voteCandidate(0);

      await multiSigWallet.connect(owner2).voteCandidate(0);

      await multiSigWallet.connect(owner3).voteCandidate(0);

      await multiSigWallet.connect(owner4).voteCandidate(0);

      await expect(
        multiSigWallet.connect(owner4).revokeVote(0)
      ).to.be.revertedWith("Candidate already elected");
    });

    it("Should fail to revoke support method due to not supporing before", async () => {
      await expect(
        multiSigWallet.connect(owner1).revokeVote(0)
      ).to.be.revertedWith("Candidate not approved");
    });

    it("Should fail to revoke support method due to time up", async () => {
      await multiSigWallet.connect(owner1).voteCandidate(0);

      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner1).revokeVote(0)
      ).to.be.revertedWith("Time up!");
    });
  });

  describe("Signing the removal of a current owner", () => {
    beforeEach(async () => {
      await multiSigWallet.connect(owner1).removeOwner(owner5Address, 300);
    });

    it("Should fail to propse the removal of an owner, if the request is made by an account which is not the user", async () => {
      await expect(
        multiSigWallet.connect(account1).removeOwner(owner5Address, 300)
      ).to.be.revertedWith("Not owner");
    });

    it("Should fail to propse the removal of an owner, if the given address is not an owner", async () => {
      await expect(
        multiSigWallet.connect(owner1).removeOwner(account2Address, 300)
      ).to.be.revertedWith("Not an owner");
    });

    it("Should fail to propse the removal of an owner, due to zero time duration", async () => {
      await expect(
        multiSigWallet.connect(owner1).removeOwner(owner6Address, 0)
      ).to.be.revertedWith("Zero time duration");
    });

    it("Should remove a current account from the owner's list", async () => {
      let ownershipStatus = await multiSigWallet.isOwner(owner5Address);
      expect(ownershipStatus).to.true;

      let proposal = await multiSigWallet.removalProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(0);
      expect(proposal["removed"]).to.false;

      let status = await multiSigWallet.supportRemoval(0, owner1Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner1).voteRemovalProposal(0);
      status = await multiSigWallet.supportRemoval(0, owner1Address);
      expect(status).to.true;

      proposal = await multiSigWallet.removalProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(1);

      status = await multiSigWallet.supportRemoval(0, owner2Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner2).voteRemovalProposal(0);
      status = await multiSigWallet.supportRemoval(0, owner2Address);
      expect(status).to.true;

      proposal = await multiSigWallet.removalProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(2);

      status = await multiSigWallet.supportRemoval(0, owner3Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner3).voteRemovalProposal(0);
      status = await multiSigWallet.supportRemoval(0, owner3Address);
      expect(status).to.true;

      proposal = await multiSigWallet.removalProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(3);

      status = await multiSigWallet.supportRemoval(0, owner4Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner4).voteRemovalProposal(0);
      status = await multiSigWallet.supportRemoval(0, owner4Address);
      expect(status).to.true;

      proposal = await multiSigWallet.removalProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(4);
      expect(proposal["removed"]).to.true;

      ownershipStatus = await multiSigWallet.isOwner(owner5Address);
      expect(ownershipStatus).to.false;
    });

    it("Should decrease required votes while accounts is removed from the owner's list", async () => {
      let reqVotes = await multiSigWallet.required();
      expect(reqVotes).to.equal(4);

      await multiSigWallet.connect(owner1).voteRemovalProposal(0);

      await multiSigWallet.connect(owner2).voteRemovalProposal(0);

      await multiSigWallet.connect(owner3).voteRemovalProposal(0);

      await multiSigWallet.connect(owner4).voteRemovalProposal(0);

      await multiSigWallet.connect(owner1).removeOwner(owner6Address, 300);

      await multiSigWallet.connect(owner1).voteRemovalProposal(1);

      await multiSigWallet.connect(owner2).voteRemovalProposal(1);

      await multiSigWallet.connect(owner3).voteRemovalProposal(1);

      await multiSigWallet.connect(owner4).voteRemovalProposal(1);

      reqVotes = await multiSigWallet.required();
      expect(reqVotes).to.equal(3);
    });

    it("Should fail to support a removal proposal, if the request is made by an account which is not the user", async () => {
      await expect(
        multiSigWallet.connect(account1).voteRemovalProposal(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should fail to support a removal proposal, which does not exists", async () => {
      await expect(
        multiSigWallet.connect(owner1).voteRemovalProposal(1)
      ).to.be.revertedWith("Removal proposal does not exists");
    });

    it("Should fail to support a removal proposal, which is already supported by that user", async () => {
      await multiSigWallet.connect(owner1).voteRemovalProposal(0);

      await expect(
        multiSigWallet.connect(owner1).voteRemovalProposal(0)
      ).to.be.revertedWith("Removal proposal already approved");
    });

    it("Should fail to support a removal proposal, for an owner whom was already removed", async () => {
      await multiSigWallet.connect(owner1).voteRemovalProposal(0);

      await multiSigWallet.connect(owner2).voteRemovalProposal(0);

      await multiSigWallet.connect(owner3).voteRemovalProposal(0);

      await multiSigWallet.connect(owner4).voteRemovalProposal(0);

      await expect(
        multiSigWallet.connect(owner6).voteRemovalProposal(0)
      ).to.be.revertedWith("Owner already removed");
    });

    it("Should fail voting for the removal of a current owner due to time up", async () => {
      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner4).voteRemovalProposal(0)
      ).to.be.revertedWith("Time up!");
    });

    it("Should revoke support for the removal of an owner", async () => {
      let proposal = await multiSigWallet.removalProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(0);

      let status = await multiSigWallet.supportRemoval(0, owner1Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner1).voteRemovalProposal(0);
      status = await multiSigWallet.supportRemoval(0, owner1Address);
      expect(status).to.true;

      proposal = await multiSigWallet.removalProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(1);

      await multiSigWallet.connect(owner1).revokeRemovalSupport(0);

      status = await multiSigWallet.supportRemoval(0, owner1Address);
      expect(status).to.false;

      proposal = await multiSigWallet.removalProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(0);
    });

    it("Should fail to revoke support for a removal proposal, if the request is made by an account which is not the user", async () => {
      await expect(
        multiSigWallet.connect(account1).revokeRemovalSupport(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should fail to revoke support for a removal proposal, which does not exists", async () => {
      await expect(
        multiSigWallet.connect(owner1).revokeRemovalSupport(1)
      ).to.be.revertedWith("Removal proposal does not exists");
    });

    it("Should fail to revoke support for a removal proposal, for an owner whom was already removed", async () => {
      await multiSigWallet.connect(owner1).voteRemovalProposal(0);

      await multiSigWallet.connect(owner2).voteRemovalProposal(0);

      await multiSigWallet.connect(owner3).voteRemovalProposal(0);

      await multiSigWallet.connect(owner4).voteRemovalProposal(0);

      await expect(
        multiSigWallet.connect(owner4).revokeRemovalSupport(0)
      ).to.be.revertedWith("Owner already removed");
    });

    it("Should fail to revoke support for removal due to not supporing before", async () => {
      await expect(
        multiSigWallet.connect(owner1).revokeRemovalSupport(0)
      ).to.be.revertedWith("Ownership removal not approved");
    });

    it("Should fail to revoke support for removal due to time up", async () => {
      await multiSigWallet.connect(owner1).voteRemovalProposal(0);

      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner1).revokeRemovalSupport(0)
      ).to.be.revertedWith("Time up!");
    });
  });

  describe("Signing the changing of required votes", () => {
    beforeEach(async () => {
      await multiSigWallet.connect(owner1).addNewRequiredVotes(5, 300);
    });

    it("Should fail, if the proposal for a new amount of required votes is made by an account which is not an owner", async () => {
      await expect(
        multiSigWallet.connect(account1).addNewRequiredVotes(5, 300)
      ).to.be.revertedWith("Not owner");
    });

    it("Should fail, if the proposed new amount of required votes is same as the current one", async () => {
      await expect(
        multiSigWallet.connect(owner1).addNewRequiredVotes(4, 300)
      ).to.be.revertedWith("Already the same required votes");
    });

    it("Should fail, if the proposed new amount of required votes is invalid amount", async () => {
      await expect(
        multiSigWallet.connect(owner1).addNewRequiredVotes(3, 300)
      ).to.be.revertedWith("Invalid number of required votes");

      await expect(
        multiSigWallet.connect(owner1).addNewRequiredVotes(6, 300)
      ).to.be.revertedWith("Invalid number of required votes");
    });

    it("Should fail, due to zero time duration", async () => {
      await expect(
        multiSigWallet.connect(owner1).addNewRequiredVotes(5, 0)
      ).to.be.revertedWith("Zero time duration");
    });

    it("Should change the required number of votes", async () => {
      let reqVotes = await multiSigWallet.required();
      expect(reqVotes).to.equal(4);

      let proposal = await multiSigWallet.requiredVotesProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(0);
      expect(proposal["changed"]).to.false;

      let status = await multiSigWallet.supportRequiredVotes(0, owner1Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner1).approveNewRequiredVotes(0);
      status = await multiSigWallet.supportRequiredVotes(0, owner1Address);
      expect(status).to.true;

      proposal = await multiSigWallet.requiredVotesProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(1);

      status = await multiSigWallet.supportRequiredVotes(0, owner2Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner2).approveNewRequiredVotes(0);
      status = await multiSigWallet.supportRequiredVotes(0, owner2Address);
      expect(status).to.true;

      proposal = await multiSigWallet.requiredVotesProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(2);

      status = await multiSigWallet.supportRequiredVotes(0, owner3Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner3).approveNewRequiredVotes(0);
      status = await multiSigWallet.supportRequiredVotes(0, owner3Address);
      expect(status).to.true;

      proposal = await multiSigWallet.requiredVotesProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(3);

      status = await multiSigWallet.supportRequiredVotes(0, owner4Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner4).approveNewRequiredVotes(0);
      status = await multiSigWallet.supportRequiredVotes(0, owner4Address);
      expect(status).to.true;

      proposal = await multiSigWallet.requiredVotesProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(4);
      expect(proposal["changed"]).to.true;

      reqVotes = await multiSigWallet.required();
      expect(reqVotes).to.equal(5);
    });

    it("Should fail, if the supporting account for a new required number of votes is not by an owner", async () => {
      await expect(
        multiSigWallet.connect(account1).approveNewRequiredVotes(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should fail, if the proposal for a new required number of votes does not exists", async () => {
      await expect(
        multiSigWallet.connect(owner1).approveNewRequiredVotes(1)
      ).to.be.revertedWith("New required votes proposal does not exists");
    });

    it("Should fail, if the proposal for a new required number of votes is already accepted by the user", async () => {
      await multiSigWallet.connect(owner1).approveNewRequiredVotes(0);

      await expect(
        multiSigWallet.connect(owner1).approveNewRequiredVotes(0)
      ).to.be.revertedWith("New required votes proposal already approved");
    });

    it("Should fail, if the proposal for a new required number of votes is already executed", async () => {
      await multiSigWallet.connect(owner1).approveNewRequiredVotes(0);

      await multiSigWallet.connect(owner2).approveNewRequiredVotes(0);

      await multiSigWallet.connect(owner3).approveNewRequiredVotes(0);

      await multiSigWallet.connect(owner4).approveNewRequiredVotes(0);

      await expect(
        multiSigWallet.connect(owner5).approveNewRequiredVotes(0)
      ).to.be.revertedWith("Required votes proposal already changed");
    });

    it("Should fail voting change the required number of votes due to time up", async () => {
      await multiSigWallet.connect(owner1).approveNewRequiredVotes(0);

      await multiSigWallet.connect(owner2).approveNewRequiredVotes(0);

      await multiSigWallet.connect(owner3).approveNewRequiredVotes(0);

      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner4).approveNewRequiredVotes(0)
      ).to.be.revertedWith("Time up!");
    });

    it("Should revoke support for changing the required number of votes", async () => {
      let proposal = await multiSigWallet.requiredVotesProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(0);

      let status = await multiSigWallet.supportRequiredVotes(0, owner1Address);
      expect(status).to.false;
      await multiSigWallet.connect(owner1).approveNewRequiredVotes(0);
      status = await multiSigWallet.supportRequiredVotes(0, owner1Address);
      expect(status).to.true;

      proposal = await multiSigWallet.requiredVotesProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(1);

      await multiSigWallet.connect(owner1).revokeNewRequiredVotes(0);

      status = await multiSigWallet.supportRequiredVotes(0, owner1Address);
      expect(status).to.false;

      proposal = await multiSigWallet.requiredVotesProposals(0);
      expect(proposal["numberOfApprovals"]).to.equal(0);
    });

    it("Should fail, if revoking support for a new required number of votes made by an account is not by an owner", async () => {
      await expect(
        multiSigWallet.connect(account1).revokeNewRequiredVotes(0)
      ).to.be.revertedWith("Not owner");
    });

    it("Should fail, if the proposal for a new required number of votes does not exists", async () => {
      await expect(
        multiSigWallet.connect(owner1).revokeNewRequiredVotes(1)
      ).to.be.revertedWith("New required votes proposal does not exists");
    });

    it("Should fail, if the proposal for a new required number of votes is already executed", async () => {
      await multiSigWallet.connect(owner1).approveNewRequiredVotes(0);

      await multiSigWallet.connect(owner2).approveNewRequiredVotes(0);

      await multiSigWallet.connect(owner3).approveNewRequiredVotes(0);

      await multiSigWallet.connect(owner4).approveNewRequiredVotes(0);

      await expect(
        multiSigWallet.connect(owner4).revokeNewRequiredVotes(0)
      ).to.be.revertedWith("Required votes proposal already changed");
    });

    it("Should fail to revoke support for changing the required number of votes due to not supporing before", async () => {
      await expect(
        multiSigWallet.connect(owner1).revokeNewRequiredVotes(0)
      ).to.be.revertedWith("New required votes proposal not approved");
    });

    it("Should fail to revoke support for changing the required number of votes due to time up", async () => {
      await multiSigWallet.connect(owner1).approveNewRequiredVotes(0);

      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      await expect(
        multiSigWallet.connect(owner1).revokeNewRequiredVotes(0)
      ).to.be.revertedWith("Time up!");
    });
  });

  describe("Testing of getCurrentTime function", () => {
    it("Should give proper timestamp", async () => {
      const firstTime = await multiSigWallet.getCurrentTime();

      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");

      const secondTime = await multiSigWallet.getCurrentTime();
      const expectedCurrentTime = firstTime.add(300);

      expect(secondTime).to.equal(expectedCurrentTime);
    });
  });
});
