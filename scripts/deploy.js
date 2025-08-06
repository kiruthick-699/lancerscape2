const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting contract deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Deploy JobPosting contract
  console.log("\n📋 Deploying JobPosting contract...");
  const JobPosting = await ethers.getContractFactory("JobPosting");
  const jobPosting = await JobPosting.deploy();
  await jobPosting.deployed();
  console.log("✅ JobPosting deployed to:", jobPosting.address);

  // Deploy Escrow contract
  console.log("\n💰 Deploying Escrow contract...");
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy();
  await escrow.deployed();
  console.log("✅ Escrow deployed to:", escrow.address);

  // Deploy Reputation contract
  console.log("\n🏆 Deploying Reputation contract...");
  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy();
  await reputation.deployed();
  console.log("✅ Reputation deployed to:", reputation.address);

  // Set up contract relationships
  console.log("\n🔗 Setting up contract relationships...");
  
  // Set escrow contract in job posting
  await jobPosting.setEscrowContract(escrow.address);
  console.log("✅ Escrow contract set in JobPosting");

  // Set reputation contract in job posting
  await jobPosting.setReputationContract(reputation.address);
  console.log("✅ Reputation contract set in JobPosting");

  // Set job posting contract in escrow
  await escrow.setJobPostingContract(jobPosting.address);
  console.log("✅ JobPosting contract set in Escrow");

  // Set reputation contract in escrow
  await escrow.setReputationContract(reputation.address);
  console.log("✅ Reputation contract set in Escrow");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("JobPosting:", jobPosting.address);
  console.log("Escrow:", escrow.address);
  console.log("Reputation:", reputation.address);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      JobPosting: jobPosting.address,
      Escrow: escrow.address,
      Reputation: reputation.address,
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\n💾 Deployment info saved to deployment.json");
  require('fs').writeFileSync(
    'deployment.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  return {
    jobPosting: jobPosting.address,
    escrow: escrow.address,
    reputation: reputation.address,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 