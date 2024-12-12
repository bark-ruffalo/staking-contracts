import { expect } from "chai";
import { ethers } from "hardhat";
import { TokenMigration, MigratedToken, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { GAS_LIMITS } from "./constants";

describe("TokenMigration", function () {
  let tokenMigration: TokenMigration;
  let migratedToken: MigratedToken;
  let oldToken: MockERC20;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MockERC20 as the old token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    oldToken = await MockERC20.deploy("Old PAWSY", "PAWSY", { gasLimit: GAS_LIMITS.DEPLOY });
    await oldToken.waitForDeployment();

    // Deploy MigratedToken first
    const MigratedToken = await ethers.getContractFactory("MigratedToken");
    migratedToken = await MigratedToken.deploy({ gasLimit: GAS_LIMITS.DEPLOY });
    await migratedToken.waitForDeployment();
    
    // Deploy TokenMigration
    const TokenMigration = await ethers.getContractFactory("TokenMigration");
    tokenMigration = await TokenMigration.deploy(
      await oldToken.getAddress(), 
      await migratedToken.getAddress(),
      { gasLimit: GAS_LIMITS.DEPLOY }
    );
    await tokenMigration.waitForDeployment();

    // Grant PAUSER_ROLE to owner
    const PAUSER_ROLE = await tokenMigration.PAUSER_ROLE();
    await tokenMigration.grantRole(PAUSER_ROLE, owner.address);
    
    // Initialize MigratedToken with TokenMigration as minter
    await migratedToken.initialize(
      owner.address,
      await tokenMigration.getAddress(),
      { gasLimit: GAS_LIMITS.HIGH }
    );

    // Grant MINTER_ROLE to TokenMigration contract
    const MINTER_ROLE = await migratedToken.MINTER_ROLE();
    await migratedToken.grantRole(MINTER_ROLE, await tokenMigration.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the correct old and new token addresses", async function () {
      expect(await tokenMigration.oldToken()).to.equal(oldToken.address);
      expect(await tokenMigration.newToken()).to.equal(migratedToken.address);
    });
  });

  describe("Token Migration", function () {
    it("Should migrate tokens correctly", async function () {
      const mintAmount = ethers.parseEther("100");
      await oldToken.mint(user1.address, mintAmount);
      await oldToken.connect(user1).approve(tokenMigration.address, mintAmount);

      await expect(tokenMigration.connect(user1).migrateTokens(mintAmount))
        .to.emit(tokenMigration, "TokensMigrated")
        .withArgs(user1.address, mintAmount);

      expect(await oldToken.balanceOf(user1.address)).to.equal(0);
      expect(await migratedToken.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it("Should revert if amount is zero", async function () {
      await expect(tokenMigration.connect(user1).migrateTokens(0)).to.be.revertedWith(
        "Amount must be greater than 0"
      );
    });

    it("Should revert if migration is paused", async function () {
      await tokenMigration.pause();
      await expect(tokenMigration.connect(user1).migrateTokens(100)).to.be.revertedWith(
        "Pausable: paused"  
      );
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to pause and unpause migration", async function () {
      await expect(tokenMigration.pause())
        .to.emit(tokenMigration, "MigrationPaused")
        .withArgs(owner.address);

      await expect(tokenMigration.unpause())
        .to.emit(tokenMigration, "MigrationUnpaused")
        .withArgs(owner.address);
    });

    it("Should revert if non-admin tries to pause or unpause migration", async function () {
      await expect(tokenMigration.connect(user1).pause()).to.be.revertedWith(
        "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a"
      );

      await expect(tokenMigration.connect(user1).unpause()).to.be.revertedWith(
        "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a"
      );
    });

    it("Should allow admin to recover ERC20 tokens", async function () {
      const mintAmount = ethers.parseEther("100");
      await migratedToken.mint(tokenMigration.address, mintAmount);

      await expect(tokenMigration.recoverERC20(migratedToken.address, mintAmount))
        .to.emit(migratedToken, "Transfer")
        .withArgs(tokenMigration.address, owner.address, mintAmount);
    });

    it("Should revert if non-admin tries to recover ERC20 tokens", async function () {
      await expect(tokenMigration.connect(user1).recoverERC20(migratedToken.address, 100)).to.be.revertedWith(
        "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Should revert if trying to recover the old token", async function () {
      await expect(tokenMigration.recoverERC20(oldToken.address, 100)).to.be.revertedWith(
        "Cannot recover old token"
      );
    });
  });
}); 