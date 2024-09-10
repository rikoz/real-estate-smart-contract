const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Property", function () {
  let Property;
  let property;
  let owner;
  let manager;
  let newOwner;
  let nonOwner;

  const MANAGER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MANAGER_ROLE"));
  const OWNER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("OWNER_ROLE"));

  beforeEach(async function () {
    [owner, manager, newOwner, nonOwner] = await ethers.getSigners();

    Property = await ethers.getContractFactory("Property");
    property = await Property.deploy();
    await property.deployed();
  });

  describe("Deployment", function () {
    it("Should set the deployer as the owner", async function () {
      expect(await property.hasRole(OWNER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Initialization", function () {
    it("Should initialize the property details correctly", async function () {
      await property.initialized(1, "https://example.com", owner.address, manager.address);
      
      const details = await property.propertyDetails();
      expect(details.propertyId).to.equal(1);
      expect(details.propertyURL).to.equal("https://example.com");
      expect(details.manager).to.equal(manager.address);
      expect(details.isForSale).to.be.false;
      expect(await property.factory()).to.equal(owner.address);
      expect(await property.hasRole(MANAGER_ROLE, manager.address)).to.be.true;
    });

    it("Should revert if not called by the owner", async function () {
      await expect(property.connect(nonOwner).initialized(1, "https://example.com", owner.address, manager.address))
        .to.be.revertedWith("Caller is not the owner");
    });
  });

  describe("Ownership Transfer", function () {
    beforeEach(async function () {
      await property.initialized(1, "https://example.com", owner.address, manager.address);
    });

    it("Should transfer ownership correctly", async function () {
      await property.transferOwnership(owner.address, newOwner.address);
      
      expect(await property.hasRole(OWNER_ROLE, newOwner.address)).to.be.true;
      expect(await property.hasRole(OWNER_ROLE, owner.address)).to.be.false;
    });

    it("Should revert if not called by the owner", async function () {
      await expect(property.connect(nonOwner).transferOwnership(owner.address, newOwner.address))
        .to.be.revertedWith("Caller is not the owner");
    });

    it("Should revert if new owner is the current manager", async function () {
      await expect(property.transferOwnership(owner.address, manager.address))
        .to.be.revertedWith("New owner cannot be the current manager");
    });

    it("Should revert if current owner does not have the owner role", async function () {
      await expect(property.transferOwnership(nonOwner.address, newOwner.address))
        .to.be.revertedWith("Current owner does not have the owner role");
    });
  });

  describe("Sale Status", function () {
    beforeEach(async function () {
      await property.initialized(1, "https://example.com", owner.address, manager.address);
    });

    it("Should set sale status correctly", async function () {
      await property.setSaleStatus(true);
      
      const details = await property.propertyDetails();
      expect(details.isForSale).to.be.true;
    });

    it("Should revert if not called by the owner", async function () {
      await expect(property.connect(nonOwner).setSaleStatus(true))
        .to.be.revertedWith("Caller is not the owner");
    });
  });
});