import { expect } from "chai";
import { ethers } from "hardhat";
import { StakingVault, RewardToken, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("StakingVault", function () {
  let stakingVault: StakingVault;
  let rewardToken: RewardToken;
  let stakingToken: MockERC20;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const WEEK = 7 * 24 * 60 * 60;
  const MONTH = 30 * 24 * 60 * 60;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy RewardToken
    const RewardToken = await ethers.getContractFactory("RewardToken");
    rewardToken = await RewardToken.deploy({ gasLimit: 30000000 });

    // Deploy Mock ERC20 for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    stakingToken = await MockERC20.deploy("Mock Token", "MTK", { gasLimit: 30000000 });

    // Deploy StakingVault
    const StakingVault = await ethers.getContractFactory("StakingVault");
    stakingVault = await StakingVault.deploy(await rewardToken.getAddress(), { gasLimit: 30000000 });

    // Grant minter role to StakingVault
    await rewardToken.transferOwnership(await stakingVault.getAddress(), { gasLimit: 30000000 });

    // Mint staking tokens to users
    const initialBalance = ethers.parseEther("1000");
    await stakingToken.mint(user1.address, initialBalance, { gasLimit: 30000000 });
    await stakingToken.mint(user2.address, initialBalance, { gasLimit: 30000000 });

    // Approve staking vault to spend tokens
    await stakingToken.connect(user1).approve(await stakingVault.getAddress(), initialBalance, { gasLimit: 30000000 });
    await stakingToken.connect(user2).approve(await stakingVault.getAddress(), initialBalance, { gasLimit: 30000000 });
  });

  describe("Pool Management", function () {
    it("Should add a new pool correctly", async function () {
      const lockPeriods = [WEEK, MONTH];
      const rewardRates = [100, 200];

      await expect(
        stakingVault.addPool(await stakingToken.getAddress(), lockPeriods, rewardRates, { gasLimit: 30000000 }),
      )
        .to.emit(stakingVault, "PoolAdded")
        .withArgs(0, await stakingToken.getAddress());

      const pool = await stakingVault.pools(0);
      expect(pool.isActive).to.be.true;
      expect(pool.stakingToken).to.equal(await stakingToken.getAddress());
    });

    it("Should revert adding pool with mismatched periods and rates", async function () {
      const lockPeriods = [WEEK];
      const rewardRates = [100, 200];

      await expect(
        stakingVault.addPool(await stakingToken.getAddress(), lockPeriods, rewardRates, { gasLimit: 30000000 }),
      ).to.be.revertedWith("Mismatched lock periods and rates");
    });

    it("Should update pool status", async function () {
      const lockPeriods = [WEEK];
      const rewardRates = [100];

      await stakingVault.addPool(await stakingToken.getAddress(), lockPeriods, rewardRates, { gasLimit: 30000000 });

      await expect(stakingVault.setPoolStatus(0, false, { gasLimit: 30000000 }))
        .to.emit(stakingVault, "PoolStatusUpdated")
        .withArgs(0, false);

      const pool = await stakingVault.pools(0);
      expect(pool.isActive).to.be.false;
    });
  });

  describe("Staking", function () {
    beforeEach(async function () {
      const lockPeriods = [WEEK, MONTH];
      const rewardRates = [100, 200];
      await stakingVault.addPool(await stakingToken.getAddress(), lockPeriods, rewardRates, { gasLimit: 30000000 });
    });

    it("Should stake tokens correctly", async function () {
      const stakeAmount = ethers.parseEther("100");

      await expect(stakingVault.connect(user1).stake(0, stakeAmount, WEEK, { gasLimit: 30000000 }))
        .to.emit(stakingVault, "Staked")
        .withArgs(user1.address, 0, stakeAmount, WEEK);

      const userLocks = await stakingVault.getUserLocks(user1.address);
      expect(userLocks[0].amount).to.equal(stakeAmount);
      expect(userLocks[0].lockPeriod).to.equal(WEEK);
    });

    it("Should revert staking when pool is inactive", async function () {
      await stakingVault.setPoolStatus(0, false, { gasLimit: 30000000 });
      const stakeAmount = ethers.parseEther("100");

      await expect(stakingVault.connect(user1).stake(0, stakeAmount, WEEK, { gasLimit: 30000000 })).to.be.revertedWith(
        "Pool is not active",
      );
    });
  });

  describe("Rewards", function () {
    beforeEach(async function () {
      const lockPeriods = [WEEK];
      const rewardRates = [100];
      await stakingVault.addPool(await stakingToken.getAddress(), lockPeriods, rewardRates, { gasLimit: 30000000 });

      await stakingVault.connect(user1).stake(0, ethers.parseEther("100"), WEEK, { gasLimit: 30000000 });
    });

    it("Should calculate rewards correctly", async function () {
      await time.increase(WEEK / 2);

      const rewards = await stakingVault.calculateRewards(user1.address, 0);
      expect(rewards).to.be.gt(0);
    });

    it("Should claim rewards correctly", async function () {
      await time.increase(WEEK / 2);

      await expect(stakingVault.connect(user1).claimRewards(0, 0, { gasLimit: 30000000 })).to.emit(
        stakingVault,
        "RewardsClaimed",
      );

      const lifetimeRewards = await stakingVault.getLifetimeRewards(user1.address);
      expect(lifetimeRewards).to.be.gt(0);
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      const lockPeriods = [WEEK];
      const rewardRates = [100];
      await stakingVault.addPool(await stakingToken.getAddress(), lockPeriods, rewardRates, { gasLimit: 30000000 });

      await stakingVault.connect(user1).stake(0, ethers.parseEther("100"), WEEK, { gasLimit: 30000000 });
    });

    it("Should not allow unstaking before lock period", async function () {
      await expect(stakingVault.connect(user1).unstake(0, 0, { gasLimit: 30000000 })).to.be.revertedWith(
        "Lock period not over",
      );
    });

    it("Should allow unstaking after lock period", async function () {
      await time.increase(WEEK);

      await expect(stakingVault.connect(user1).unstake(0, 0, { gasLimit: 30000000 })).to.emit(stakingVault, "Unstaked");

      const userLocks = await stakingVault.getUserLocks(user1.address);
      expect(userLocks[0].isLocked).to.be.false;
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow emergency unlock by owner", async function () {
      const lockPeriods = [MONTH];
      const rewardRates = [100];
      await stakingVault.addPool(await stakingToken.getAddress(), lockPeriods, rewardRates, { gasLimit: 30000000 });

      await stakingVault.connect(user1).stake(0, ethers.parseEther("100"), MONTH, { gasLimit: 30000000 });

      await stakingVault.emergencyUnlockAll({ gasLimit: 30000000 });

      const userLocks = await stakingVault.getUserLocks(user1.address);
      console.log({ userLocks });
      expect(userLocks[0].isLocked).to.be.false;
    });

    it("Should allow owner to pause and unpause", async function () {
      await stakingVault.pause({ gasLimit: 30000000 });
      expect(await stakingVault.paused()).to.be.true;

      await stakingVault.unpause({ gasLimit: 30000000 });
      expect(await stakingVault.paused()).to.be.false;
    });
  });
});
