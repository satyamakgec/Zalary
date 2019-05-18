pragma solidity >=0.5.0 <0.7.0;
import "@aztec/protocol/contracts/ERC1724/ZkAssetMintable.sol";
import "@aztec/protocol/contracts/libs/NoteUtils.sol";
import "@aztec/protocol/contracts/interfaces/IZkAsset.sol";
import "./Utilities.sol";

contract Zalary is ZkAssetMintable {
  using SafeMath for uint256;
  using NoteUtils for bytes;
  using Utilities for Utilities.SalaryVariables;
  Utilities.SalaryVariables public salaryVariables;

  IZkAsset public settlementToken;
  // [0] SPS
  // [1] settlementCurrencyId
  // [2] lastSalaryPaymentDate address public employer;
  address public employer;
  address public employee;

  event SalaryPayment(string paymentType, uint256 lastSalaryPaymentDate);
  event Default();

  struct Note {
    address owner;
    bytes32 noteHash;
  }

  function _noteCoderToStruct(bytes memory note) internal pure returns (Note memory codedNote) {
    (address owner, bytes32 noteHash, ) = note.extractNote();
    return Note(owner, noteHash);
  }

  constructor(
    bytes32 _notionalHash,
    uint256 _totalSalary,
    uint256 _totalDuration,
    address _employer,
    address _aceAddress,
    address _settlementCurrency
  ) public ZkAssetMintable(_aceAddress, address(0), 1, true, false) {
    salaryVariables.zalaryFactory = msg.sender;
    salaryVariables.notionalHash = _notionalHash;
    salaryVariables.id = address(this);
    salaryVariables.totalSalary = _totalSalary;
    salaryVariables.totalDuration = _totalDuration;
    salaryVariables.employer = _employer;
    employer = _employer;
    salaryVariables.settlementToken = IZkAsset(_settlementCurrency);
    salaryVariables.aceAddress = _aceAddress;
  }

  function fire(bytes calldata _proofData) external {
    Utilities.onlyZalaryDapp(msg.sender, salaryVariables.zalaryFactory);
    delete salaryVariables;
  }

  function confidentialMint(uint24 _proof, bytes calldata _proofData) external {
    Utilities.onlyZalaryDapp(msg.sender, salaryVariables.zalaryFactory);
    require(msg.sender == owner, "only owner can call the confidentialMint() method");
    require(_proofData.length != 0, "proof invalid");
    // overide this function to change the mint method to msg.sender
    bytes memory _proofOutputs = ace.mint(_proof, _proofData, msg.sender);

    (, bytes memory newTotal, , ) = _proofOutputs.get(0).extractProofOutput();

    (, bytes memory mintedNotes, , ) = _proofOutputs.get(1).extractProofOutput();

    (, bytes32 noteHash, bytes memory metadata) = newTotal.extractNote();

    logOutputNotes(mintedNotes);
    emit UpdateTotalMinted(noteHash, metadata);
  }

  function withdrawSalary(bytes memory _proof1, bytes memory _proof2, uint256 _salaryDurationToWithdraw) public {
    (, bytes memory _proof1OutputNotes) = Utilities._validateSalaryProof(_proof1, _salaryDurationToWithdraw, salaryVariables);

    require(
      _salaryDurationToWithdraw.add(salaryVariables.lastSalaryPaymentDate) < block.timestamp,
      " withdraw is greater than accrued salary"
    );

    bytes32 newCurrentSalaryNoteHash = Utilities._processSalaryWithdrawal(_proof2, _proof1OutputNotes, salaryVariables);

    salaryVariables.currentSalaryBalance = newCurrentSalaryNoteHash;
    salaryVariables.lastSalaryPaymentDate = salaryVariables.lastSalaryPaymentDate.add(_salaryDurationToWithdraw);

    emit SalaryPayment("SALARY", salaryVariables.lastSalaryPaymentDate);

  }

  function settle(bytes calldata _proofData, bytes32 _currentSalaryBalance, address _employee) external {
    Utilities.onlyZalaryDapp(msg.sender, salaryVariables.zalaryFactory);

    Utilities._processSalarySettlement(_proofData, salaryVariables);

    salaryVariables.lastSalaryPaymentDate = block.timestamp;
    salaryVariables.currentSalaryBalance = _currentSalaryBalance;
    salaryVariables.employee = _employee;
    employee = _employee;
  }
}
