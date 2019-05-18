pragma solidity >=0.5.0 <0.7.0;
import "@aztec/protocol/contracts/libs/NoteUtils.sol";
import "@aztec/protocol/contracts/ERC1724/ZkAssetMintable.sol";
import "@aztec/protocol/contracts/interfaces/IZkAsset.sol";
import "./ZKERC20/ZKERC20.sol";

library Utilities {
  using SafeMath for uint256;
  using SafeMath for uint32;
  using NoteUtils for bytes;

  uint256 constant scalingFactor = 1000000000;
  uint24 constant DIVIDEND_PROOF = 66561;
  uint24 constant JOIN_SPLIT_PROOF = 65793;
  uint24 constant MINT_PRO0F = 66049;
  uint24 constant BILATERAL_SWAP_PROOF = 65794;
  uint24 constant PRIVATE_RANGE_PROOF = 66562;

  struct Note {
    address owner;
    bytes32 noteHash;
  }

  struct SalaryVariables {
    bytes32 notionalHash;
    uint256 totalSalary;
    uint256 totalDuration;
    uint256 lastSalaryPaymentDate;
    bytes32 currentSalaryBalance;
    address employee;
    address employer;
    address zalaryFactory;
    address aceAddress;
    IZkAsset settlementToken;
    address id;
  }

  function _noteCoderToStruct(bytes memory note) internal pure returns (Note memory codedNote) {
    (address owner, bytes32 noteHash, ) = note.extractNote();
    return Note(owner, noteHash);
  }

  function getRatio(bytes memory _proofData) internal pure returns (uint256 ratio) {
    uint256 za;
    uint256 zb;
    assembly {
      za := mload(add(_proofData, 0x40))
      zb := mload(add(_proofData, 0x60))
    }
    return za.mul(scalingFactor).div(zb);
  }

  function onlyZalaryDapp(address sender, address zalaryFactory) external pure {
    require(sender == zalaryFactory, "sender is not the salary dapp");
  }

  function onlyEmployer(address sender, address employer) external pure {
    require(sender == employer, "sender is not the employer");
  }

  function _validateDefaultProofs(
    bytes calldata _proof1,
    bytes calldata _proof2,
    uint256 _salaryDuration,
    SalaryVariables storage _salaryVariables
  ) external {
    (, bytes memory _proof1OutputNotes) = _validateSalaryProof(_proof1, _salaryDuration, _salaryVariables);
    bytes memory _proof2Outputs = ACE(_salaryVariables.aceAddress).validateProof(PRIVATE_RANGE_PROOF, address(this), _proof2);
    (bytes memory _proof2InputNotes, , , ) = _proof2Outputs.get(0).extractProofOutput();

    require(
      _noteCoderToStruct(_proof2InputNotes.get(0)).noteHash == _noteCoderToStruct(_proof1OutputNotes.get(0)).noteHash,
      "withdraw note in 2 is not the same as 1"
    );

    require(
      _noteCoderToStruct(_proof2InputNotes.get(1)).noteHash == _salaryVariables.currentSalaryBalance,
      "salary note in 2 is not correct"
    );

  }

  function _validateSalaryProof(bytes memory _proof1, uint256 _salaryDuration, SalaryVariables storage _salaryVariables)
    internal
    returns (bytes memory _proof1InputNotes, bytes memory _proof1OutputNotes)
  {
    //PROOF 1

    //NotionalNote * a = WithdrawableSalaryNote * b

    require(getRatio(_proof1).div(10000) == _salaryVariables.totalDuration.mul(scalingFactor).div(_salaryDuration), "ratios do not match");

    bytes memory _proof1Outputs = ACE(_salaryVariables.aceAddress).validateProof(DIVIDEND_PROOF, address(this), _proof1);
    (_proof1InputNotes, _proof1OutputNotes, , ) = _proof1Outputs.get(0).extractProofOutput();
    require(_noteCoderToStruct(_proof1InputNotes.get(0)).noteHash == _salaryVariables.notionalHash, "incorrect notional note in proof 1");

  }

  function _processSalaryWithdrawal(bytes calldata _proof2, bytes calldata _proof1OutputNotes, SalaryVariables storage _salaryVariables)
    external
    returns (bytes32 newcurrentSalaryBalance)
  {
    bytes memory _proof2Outputs = ACE(_salaryVariables.aceAddress).validateProof(JOIN_SPLIT_PROOF, address(this), _proof2);
    (bytes memory _proof2InputNotes, bytes memory _proof2OutputNotes, , ) = _proof2Outputs.get(0).extractProofOutput();

    require(
      _noteCoderToStruct(_proof2OutputNotes.get(0)).noteHash == _noteCoderToStruct(_proof1OutputNotes.get(0)).noteHash,
      "withdraw note in 2 is not the same as 1"
    );

    require(
      _noteCoderToStruct(_proof2InputNotes.get(0)).noteHash == _salaryVariables.currentSalaryBalance,
      "salary note in 2 is not correct"
    );

    _salaryVariables.settlementToken.confidentialApprove(_noteCoderToStruct(_proof2InputNotes.get(0)).noteHash, address(this), true, "");

    _salaryVariables.settlementToken.confidentialTransferFrom(JOIN_SPLIT_PROOF, _proof2Outputs.get(0));

    newcurrentSalaryBalance = _noteCoderToStruct(_proof2OutputNotes.get(1)).noteHash;

  }

  function _processAdjustSalary(bytes calldata _proofData, SalaryVariables storage _salaryVariables)
    external
    returns (bytes32 newcurrentSalaryBalance)
  {
    bytes memory _proofOutputs = ACE(_salaryVariables.aceAddress).validateProof(JOIN_SPLIT_PROOF, address(this), _proofData);
    (bytes memory _proofInputNotes, bytes memory _proofOutputNotes, , ) = _proofOutputs.get(0).extractProofOutput();
    require(
      _noteCoderToStruct(_proofInputNotes.get(0)).noteHash == _salaryVariables.currentSalaryBalance,
      "salary note does not match input note"
    );

    require(_noteCoderToStruct(_proofOutputNotes.get(1)).owner == address(this), "output note not owned by contract");

    _salaryVariables.settlementToken.confidentialApprove(_noteCoderToStruct(_proofInputNotes.get(0)).noteHash, address(this), true, "");

    _salaryVariables.settlementToken.confidentialTransferFrom(JOIN_SPLIT_PROOF, _proofOutputs.get(0));
    newcurrentSalaryBalance = _noteCoderToStruct(_proofOutputNotes.get(1)).noteHash;

  }

  function _processSalarySettlement(bytes calldata _proofData, SalaryVariables storage _salaryVariables) external {
    bytes memory _proofOutputs = ACE(_salaryVariables.aceAddress).validateProof(65794, address(this), _proofData);
    bytes memory _salaryProofOutputs = _proofOutputs.get(0);
    bytes memory _settlementProofOutputs = _proofOutputs.get(1);

    _salaryVariables.settlementToken.confidentialTransferFrom(BILATERAL_SWAP_PROOF, _settlementProofOutputs);

    IZkAsset(_salaryVariables.id).confidentialTransferFrom(BILATERAL_SWAP_PROOF, _salaryProofOutputs);
  }

  function _processsalaryRepayment(bytes calldata _proof2, bytes calldata _proof1OutputNotes, SalaryVariables storage _salaryVariables)
    external
  {
    bytes memory _proof2Outputs = ACE(_salaryVariables.aceAddress).validateProof(JOIN_SPLIT_PROOF, address(this), _proof2);
    (bytes memory _proof2InputNotes, bytes memory _proof2OutputNotes, , ) = _proof2Outputs.get(0).extractProofOutput();

    // require(_noteCoderToStruct(_proof2InputNotes.get(1)).noteHash ==
    //         _noteCoderToStruct(_proof1OutputNotes.get(0)).noteHash, 'withdraw note in 2 is not the same as  1');

    // require(_noteCoderToStruct(_proof2InputNotes.get(0)).noteHash == _salaryVariables.notional, 'notional in 2 is not the same as 1');

    require(_noteCoderToStruct(_proof2OutputNotes.get(0)).owner == _salaryVariables.employee, "output note is not owned by the employee");
    require(_noteCoderToStruct(_proof2OutputNotes.get(1)).owner == _salaryVariables.employee, "output note is not owned by the employee");

    _salaryVariables.settlementToken.confidentialApprove(_noteCoderToStruct(_proof2InputNotes.get(0)).noteHash, address(this), true, "");
    // the first note is the current salary note

    _salaryVariables.settlementToken.confidentialTransferFrom(JOIN_SPLIT_PROOF, _proof2Outputs.get(0));

  }

}
