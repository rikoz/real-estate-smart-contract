const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NigeriaGovernment", function () {
  let NigeriaGovernment;
  let nigeriaGovernment;
  let Property;
  let property;
  let Token;
  let token;
  let owner;
  let minister;
  let validator;
  let manager;
  let buyer;

  const MINISTRY_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINISTRY_ROLE"));
  const VALIDATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VALIDATOR_ROLE"));

  beforeEach(async function () {
    [owner, minister, validator, manager, buyer] = await ethers.getSigners();

    Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy("NGN Token", "NGN");
    await token.deployed();

    Property = await ethers.getContractFactory("Property");
    
    NigeriaGovernment = await ethers.getContractFactory("NigeriaGovernment");
    nigeriaGovernment = await NigeriaGovernment.deploy(minister.address, validator.address, token.address);
    await nigeriaGovernment.deployed();
  });

  describe("Deployment", function () {
    it("Should set the correct roles", async function () {
      expect(await nigeriaGovernment.hasRole(MINISTRY_ROLE, minister.address)).to.be.true;
      expect(await nigeriaGovernment.hasRole(VALIDATOR_ROLE, validator.address)).to.be.true;
    });

    it("Should set the correct currency token", async function () {
      expect(await nigeriaGovernment.currencyToken()).to.equal(token.address);
    });
  });

  describe("Property Creation", function () {
    it("Should create a new property", async function () {
      await expect(nigeriaGovernment.connect(validator).createProperty(
        ["https://example.com/property1"],
        [manager.address]
      )).to.emit(nigeriaGovernment, "PropertyCreated")
        .withArgs(1, "https://example.com/property1", await nigeriaGovernment.propertyDetails(1).then(p => p.property));

      const property = await nigeriaGovernment.propertyDetails(1);
      expect(property.tokenId).to.equal(1);
      expect(property.tokenURI).to.equal("https://example.com/property1");
      expect(property.isApproved).to.be.false;
      expect(property.manager).to.equal(manager.address);
    });

    it("Should revert if not called by validator", async function () {
      await expect(nigeriaGovernment.connect(buyer).createProperty(
        ["https://example.com/property1"],
        [manager.address]
      )).to.be.revertedWith("AccessControl:");
    });
  });

  describe("Property Approval", function () {
    beforeEach(async function () {
      await nigeriaGovernment.connect(validator).createProperty(
        ["https://example.com/property1"],
        [manager.address]
      );
    });

    it("Should approve a property", async function () {
      await expect(nigeriaGovernment.connect(minister).setPropertyApproveStatus([1], true))
        .to.emit(nigeriaGovernment, "PropertyApproved")
        .withArgs(1, true);

      const property = await nigeriaGovernment.propertyDetails(1);
      expect(property.isApproved).to.be.true;
    });

    it("Should revert if not called by minister", async function () {
      await expect(nigeriaGovernment.connect(buyer).setPropertyApproveStatus([1], true))
        .to.be.revertedWith("AccessControl:");
    });
  });

  describe("Property Bidding", function () {
    beforeEach(async function () {
      await nigeriaGovernment.connect(validator).createProperty(
        ["https://example.com/property1"],
        [manager.address]
      );
      await nigeriaGovernment.connect(minister).setPropertyApproveStatus([1], true);
      await token.mint(buyer.address, ethers.utils.parseEther("1000"));
      await token.connect(buyer).approve(nigeriaGovernment.address, ethers.utils.parseEther("1000"));
      
      // Set property for sale
      const propertyAddress = await nigeriaGovernment.propertyDetails(1).then(p => p.property);
      property = await Property.attach(propertyAddress);
      await property.connect(manager).setSaleStatus(true);
    });

    it("Should place a bid on a property", async function () {
      await expect(nigeriaGovernment.connect(buyer).bidProperty(1, ethers.utils.parseEther("100"), buyer.address))
        .to.emit(nigeriaGovernment, "PropertyBid")
        .withArgs(1, buyer.address, buyer.address, ethers.utils.parseEther("100"));

      const bid = await nigeriaGovernment.getBidProperty(1);
      expect(bid.highestBidder).to.equal(buyer.address);
      expect(bid.highestBid).to.equal(ethers.utils.parseEther("100"));
    });

    it("Should revert if property is not for sale", async function () {
      await property.connect(manager).setSaleStatus(false);
      await expect(nigeriaGovernment.connect(buyer).bidProperty(1, ethers.utils.parseEther("100"), buyer.address))
        .to.be.revertedWith("Property not for sale");
    });
  });

  describe("Approve Bid and Transfer Ownership", function () {
    beforeEach(async function () {
      await nigeriaGovernment.connect(validator).createProperty(
        ["https://example.com/property1"],
        [manager.address]
      );
      await nigeriaGovernment.connect(minister).setPropertyApproveStatus([1], true);
      await token.mint(buyer.address, ethers.utils.parseEther("1000"));
      await token.connect(buyer).approve(nigeriaGovernment.address, ethers.utils.parseEther("1000"));
      
      const propertyAddress = await nigeriaGovernment.propertyDetails(1).then(p => p.property);
      property = await Property.attach(propertyAddress);
      await property.connect(manager).setSaleStatus(true);
      
      await nigeriaGovernment.connect(buyer).bidProperty(1, ethers.utils.parseEther("100"), buyer.address);
    });

    it("Should approve bid and transfer ownership", async function () {
      await expect(nigeriaGovernment.connect(manager).approveBidAndTransferOwnership(1))
        .to.emit(property, "OwnershipTransferred");

      const newOwner = await property.hasRole(await property.OWNER_ROLE(), buyer.address);
      expect(newOwner).to.be.true;
    });

    it("Should revert if not called by manager or ministry", async function () {
      await expect(
        nigeriaGovernment.connect(buyer).approveBidAndTransferOwnership(1)
      ).to.be.revertedWith("AccessControl: account 0x0000000000000000000000000000000000000000 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000");
    });
  });
});