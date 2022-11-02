module.exports = {
  configureYulOptimizer: true,
  skipFiles: ["test/TestContract.sol", "test/TestERC20.sol", "MyToken.sol"],
  measureStatementCoverage: true,
  measureFunctionCoverage: true,
  measureModifierCoverage: true,
};
