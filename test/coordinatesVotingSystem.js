const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("CoordinatesVotingSystem contract test:", () => {
  let votingSystem;
  let hardhatVotingSystem;

  // accounts
  let account1;
  let account2;

  beforeEach(async () => {
    [deployer, account1, account2, treasury] = await ethers.getSigners();

    // coordinatesVotingSystem Contract prepare
    votingSystem = await ethers.getContractFactory("CoordinatesVotingSystem");
    hardhatVotingSystem = await votingSystem.deploy(0, 100, 0, 200);
  });

  describe("makeBuyProposal function test", () => {
    it("should be failed when terrain is outside of map", async () => {
      await expect(
        hardhatVotingSystem
          .connect(deployer)
          .makeBuyProposal("proposal1", 100, 103, 0, 3)
      ).to.be.revertedWith("Terrain is not in map");
    });

    it("should be failed when terrain is outside of map", async () => {
      await expect(
        hardhatVotingSystem
          .connect(deployer)
          .makeBuyProposal("proposal1", 0, 5, 0, 5)
      ).to.be.revertedWith("Out of terrain size");
    });

    it("should be succeeded when a proposal is initially requested", async () => {
      await hardhatVotingSystem
        .connect(account1)
        .makeBuyProposal("proposal1", 0, 3, 0, 3);

      const proposal = await hardhatVotingSystem.getBuyProposal("proposal1");
      const proposalStatus = await hardhatVotingSystem.getBuyProposalStatus(
        account1.address,
        "proposal1"
      );

      expect(proposal.creator).to.be.equal(account1.address);
      expect(proposal.terrain.owner).to.be.equal(account1.address);
      expect(proposal.terrain.point1.x.toString()).to.be.equal("0");
      expect(proposal.terrain.point2.x.toString()).to.be.equal("3");
      expect(proposal.terrain.point1.y.toString()).to.be.equal("0");
      expect(proposal.terrain.point2.y.toString()).to.be.equal("3");
      expect(proposalStatus).to.be.equal(true);
    });

    it("should be failed when a proposal is requested with the same name", async () => {
      await hardhatVotingSystem
        .connect(account1)
        .makeBuyProposal("proposal1", 0, 3, 0, 3);

      await expect(
        hardhatVotingSystem
          .connect(account1)
          .makeBuyProposal("proposal1", 0, 3, 0, 3)
      ).to.be.revertedWith("Proposal name was already used");
    });

    it("should be failed when unavailable(sold) terrain is requested", async () => {
      await hardhatVotingSystem
        .connect(account1)
        .makeBuyProposal("proposal1", 0, 3, 0, 3);

      await hardhatVotingSystem
        .connect(deployer)
        .voteTerrainProposal("proposal1");

      await expect(
        hardhatVotingSystem
          .connect(account2)
          .makeBuyProposal("proposal2", 0, 3, 0, 3)
      ).to.be.revertedWith("Terrain was already sold");
    });

    it("should be failed when requested terrain was already sold", async () => {
      await hardhatVotingSystem
        .connect(account1)
        .makeBuyProposal("proposal1", 0, 3, 0, 3);

      await hardhatVotingSystem
        .connect(deployer)
        .voteTerrainProposal("proposal1");

      await expect(
        hardhatVotingSystem
          .connect(account1)
          .makeBuyProposal("proposal2", 0, 3, 0, 3)
      ).to.be.revertedWith("Terrain was already sold");
      const proposal = await hardhatVotingSystem.getBuyProposal("proposal1");
      const proposalStatus = await hardhatVotingSystem.getBuyProposalStatus(
        account1.address,
        "proposal1"
      );

      expect(proposal.creator).to.be.equal(account1.address);
      expect(proposal.terrain.owner).to.be.equal(account1.address);
      expect(proposal.terrain.point1.x.toString()).to.be.equal("0");
      expect(proposal.terrain.point2.x.toString()).to.be.equal("3");
      expect(proposal.terrain.point1.y.toString()).to.be.equal("0");
      expect(proposal.terrain.point2.y.toString()).to.be.equal("3");
      expect(proposalStatus).to.be.equal(true);
    });

    it("should be succeeded when available terrain is requested 2 times", async () => {
      await hardhatVotingSystem
        .connect(account1)
        .makeBuyProposal("proposal1", 0, 3, 0, 3);

      await hardhatVotingSystem
        .connect(deployer)
        .voteTerrainProposal("proposal1");

      await hardhatVotingSystem
        .connect(account1)
        .makeBuyProposal("proposal2", 3, 6, 3, 6);

      const proposal = await hardhatVotingSystem.getBuyProposal("proposal2");
      const proposalStatus = await hardhatVotingSystem.getBuyProposalStatus(
        account1.address,
        "proposal2"
      );

      expect(proposal.creator).to.be.equal(account1.address);
      expect(proposal.terrain.owner).to.be.equal(account1.address);
      expect(proposal.terrain.point1.x.toString()).to.be.equal("3");
      expect(proposal.terrain.point2.x.toString()).to.be.equal("6");
      expect(proposal.terrain.point1.y.toString()).to.be.equal("3");
      expect(proposal.terrain.point2.y.toString()).to.be.equal("6");
      expect(proposalStatus).to.be.equal(true);
    });
  });

  describe("voteTerrainProposal function test", () => {
    it("should be failed when proposal was not made", async () => {
      await expect(
        hardhatVotingSystem.connect(deployer).voteTerrainProposal("proposal1")
      ).to.be.revertedWith("Proposal was not made with this name");
    });

    it("should be failed when vote is called from not owner", async () => {
      await hardhatVotingSystem
        .connect(account1)
        .makeBuyProposal("proposal1", 0, 3, 0, 3);

      await expect(
        hardhatVotingSystem.connect(account1).voteTerrainProposal("proposal1")
      ).to.be.revertedWith("Not owner");
    });

    it("should be failed when vote is called from proposal creator", async () => {
      await hardhatVotingSystem
        .connect(deployer)
        .makeBuyProposal("proposal1", 0, 3, 0, 3);

      await expect(
        hardhatVotingSystem.connect(deployer).voteTerrainProposal("proposal1")
      ).to.be.revertedWith("Proposal can't be voted by proposal creator");
    });

    it("should be succeeded when owner votes available proposal", async () => {
      await hardhatVotingSystem
        .connect(account1)
        .makeBuyProposal("proposal1", 0, 3, 0, 3);

      // before vote
      const totalOwnerCntBefore = await hardhatVotingSystem.totalOwnerCnt();
      const proposalBefore = await hardhatVotingSystem.getBuyProposal(
        "proposal1"
      );

      // call vote
      await hardhatVotingSystem
        .connect(deployer)
        .voteTerrainProposal("proposal1");

      // after vote
      const account1IsOwner = await hardhatVotingSystem.owners(
        account1.address
      );
      const totalOwnerCntAfter = await hardhatVotingSystem.totalOwnerCnt();
      const proposalAfter = await hardhatVotingSystem.getBuyProposal(
        "proposal1"
      );
      const voterStatus = await hardhatVotingSystem.getTerrainVoterStatus(
        deployer.address,
        "proposal1"
      );

      expect(account1IsOwner).to.be.equal(true);
      expect(proposalAfter.voteCnt).to.be.equal(proposalBefore.voteCnt + 1);
      expect(voterStatus).to.be.equal(true);
      expect(totalOwnerCntAfter.toNumber()).to.be.equal(
        totalOwnerCntBefore.toNumber() + 1
      );
    });

    it("should be failed when owner tries to vote 2 times", async () => {
      await hardhatVotingSystem
        .connect(account1)
        .makeBuyProposal("proposal1", 0, 3, 0, 3);

      await hardhatVotingSystem
        .connect(deployer)
        .voteTerrainProposal("proposal1");

      await expect(
        hardhatVotingSystem.connect(deployer).voteTerrainProposal("proposal1")
      ).to.be.revertedWith("Already voted");
    });
  });

  describe("makeExtendProposal function test", () => {
    it("should be failed when new map is overlapped with existing maps", async () => {
      await expect(
        hardhatVotingSystem
          .connect(deployer)
          .makeExtendProposal("proposal1", 0, 50, 0, 100)
      ).to.be.revertedWith("Map is overlapped with existing maps");
    });

    it("should be succeeded when a proposal is requested with valid map", async () => {
      await hardhatVotingSystem
        .connect(account1)
        .makeExtendProposal("proposal1", 100, 200, 200, 400);

      const proposal = await hardhatVotingSystem.getExtendProposal("proposal1");
      const proposalStatus = await hardhatVotingSystem.getExtendProposalStatus(
        account1.address,
        "proposal1"
      );

      expect(proposal.creator).to.be.equal(account1.address);
      expect(proposal.terrain.owner).to.be.equal(account1.address);
      expect(proposal.terrain.point1.x.toString()).to.be.equal("100");
      expect(proposal.terrain.point2.x.toString()).to.be.equal("200");
      expect(proposal.terrain.point1.y.toString()).to.be.equal("200");
      expect(proposal.terrain.point2.y.toString()).to.be.equal("400");
      expect(proposalStatus).to.be.equal(true);
    });

    it("should be failed when a proposal is requested with the same name", async () => {
      await hardhatVotingSystem
        .connect(account1)
        .makeExtendProposal("proposal1", 100, 200, 200, 400);

      await expect(
        hardhatVotingSystem
          .connect(account1)
          .makeExtendProposal("proposal1", 100, 200, 200, 400)
      ).to.be.revertedWith("Proposal name was already used");
    });
  });

  describe("voteMapProposal function test", () => {
    it("should be failed when proposal was not made", async () => {
      await expect(
        hardhatVotingSystem.connect(deployer).voteMapProposal("proposal1")
      ).to.be.revertedWith("Proposal was not made with this name");
    });

    it("should be failed when vote is called from not owner", async () => {
      await hardhatVotingSystem
        .connect(account1)
        .makeExtendProposal("proposal1", 100, 200, 200, 400);

      await expect(
        hardhatVotingSystem.connect(account1).voteMapProposal("proposal1")
      ).to.be.revertedWith("Not owner");
    });

    it("should be failed when vote is called from proposal creator", async () => {
      await hardhatVotingSystem
        .connect(deployer)
        .makeExtendProposal("proposal1", 100, 200, 200, 400);

      await expect(
        hardhatVotingSystem.connect(deployer).voteMapProposal("proposal1")
      ).to.be.revertedWith("Proposal can't be voted by proposal creator");
    });

    it("should be succeeded when owner votes available proposal", async () => {
      await hardhatVotingSystem
        .connect(account1)
        .makeExtendProposal("proposal1", 100, 200, 200, 400);

      // before vote
      const proposalBefore = await hardhatVotingSystem.getExtendProposal(
        "proposal1"
      );

      // call vote
      await hardhatVotingSystem.connect(deployer).voteMapProposal("proposal1");

      // after vote
      const proposalAfter = await hardhatVotingSystem.getExtendProposal(
        "proposal1"
      );
      const voterStatus = await hardhatVotingSystem.getMapVoterStatus(
        deployer.address,
        "proposal1"
      );

      expect(proposalAfter.voteCnt).to.be.equal(proposalBefore.voteCnt + 1);
      expect(voterStatus).to.be.equal(true);
    });

    it("should be failed when owner tries to vote 2 times", async () => {
      await hardhatVotingSystem
        .connect(account1)
        .makeExtendProposal("proposal1", 100, 200, 200, 400);

      await hardhatVotingSystem.connect(deployer).voteMapProposal("proposal1");

      await expect(
        hardhatVotingSystem.connect(deployer).voteMapProposal("proposal1")
      ).to.be.revertedWith("Already voted");
    });
  });
});
