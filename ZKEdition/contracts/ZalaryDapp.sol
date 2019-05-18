pragma solidity >=0.5.0 <0.7.0;

import "@aztec/protocol/contracts/interfaces/IAZTEC.sol";
import "@aztec/protocol/contracts/libs/NoteUtils.sol";
import "@aztec/protocol/contracts/ERC1724/ZkAsset.sol";
import "./ZKERC20/ZKERC20.sol";
import "./Zalary.sol";

contract ZalaryDapp is IAZTEC {
  using NoteUtils for bytes;

  event SettlementCurrencyAdded(uint256 id, address settlementAddress);

  event salaryApprovedForSettlement(address salaryId);

  event salaryCreated(
    address id,
    address employer,
    string employerPublicKey,
    uint256 totalSalary,
    uint256 totalDuration,
    uint256 createdAt
  );

  event ViewRequestCreated(address salaryId, address employee, string employeePublicKey);

  event ViewRequestApproved(uint256 accessId, address salaryId, address user, string sharedSecret);

  event NoteAccessApproved(uint256 accessId, bytes32 note, address user, string sharedSecret);

  address owner = msg.sender;
  address aceAddress;
  address[] public salaries;
  mapping(uint256 => address) public settlementCurrencies;

  uint24 MINT_PRO0F = 66049;
  uint24 BILATERAL_SWAP_PROOF = 65794;

  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  modifier onlyEmployer(address _salaryAddress) {
    Zalary salaryContract = Zalary(_salaryAddress);
    require(msg.sender == salaryContract.employer());
    _;
  }

  constructor(address _aceAddress) public {
    aceAddress = _aceAddress;
  }

  function _getCurrencyContract(uint256 _settlementCurrencyId) internal view returns (address) {
    require(settlementCurrencies[_settlementCurrencyId] != address(0), "Settlement Currency is not defined");
    return settlementCurrencies[_settlementCurrencyId];
  }

  function _generateAccessId(bytes32 _note, address _user) internal pure returns (uint) {
    return uint(keccak256(abi.encodePacked(_note, _user)));
  }

  function _approveNoteAccess(bytes32 _note, address _userAddress, string memory _sharedSecret) internal {
    uint256 accessId = _generateAccessId(_note, _userAddress);
    emit NoteAccessApproved(accessId, _note, _userAddress, _sharedSecret);
  }

  function _createSalary(
    bytes32 _notionalHash,
    uint256 _totalSalary,
    uint256 _totalDuration,
    uint256 _settlementCurrencyId,
    bytes memory _proofData
  ) private returns (address) {
    address salaryCurrency = _getCurrencyContract(_settlementCurrencyId);

    Zalary newSalary = new Zalary(_notionalHash, _totalSalary, _totalDuration, msg.sender, aceAddress, salaryCurrency);

    salaries.push(address(newSalary));
    Zalary salaryContract = Zalary(address(newSalary));

    salaryContract.setProofs(1, uint256(-1));
    salaryContract.confidentialMint(MINT_PROOF, bytes(_proofData));

    return address(newSalary);
  }

  function addSettlementCurrency(uint256 _id, address _address) external onlyOwner {
    settlementCurrencies[_id] = _address;
    emit SettlementCurrencyAdded(_id, _address);
  }

  function createSalary(
    bytes32 _notionalHash,
    string calldata _viewingKey,
    string calldata _employerPublicKey,
    uint256 _totalSalary,
    uint256 _totalDuration,
    uint256 _settlementCurrencyId,
    bytes calldata _proofData
  ) external {
    address salaryId = _createSalary(_notionalHash, _totalSalary, _totalDuration, _settlementCurrencyId, _proofData);

    emit salaryCreated(salaryId, msg.sender, _employerPublicKey, _totalSalary, _totalDuration, block.timestamp);

    _approveNoteAccess(_notionalHash, msg.sender, _viewingKey);
  }

  function approveSalaryNotional(bytes32 _noteHash, bytes memory _signature, address _salaryId) public {
    Zalary salaryContract = Zalary(_salaryId);
    salaryContract.confidentialApprove(_noteHash, _salaryId, true, _signature);
    emit salaryApprovedForSettlement(_salaryId);
  }

  function submitViewRequest(address _salaryId, string calldata _employeePublicKey) external {
    emit ViewRequestCreated(_salaryId, msg.sender, _employeePublicKey);
  }

  function approveViewRequest(address _salaryId, address _employee, bytes32 _notionalNote, string calldata _sharedSecret)
    external
    onlyEmployer(_salaryId)
  {
    uint256 accessId = _generateAccessId(_notionalNote, _employee);

    emit ViewRequestApproved(accessId, _salaryId, _employee, _sharedSecret);
  }

  event SettlementSuccesfull(address indexed from, address indexed to, address salaryId, uint256 timestamp);

  struct salaryPayment {
    address from;
    address to;
  }

  mapping(uint256 => mapping(uint256 => salaryPayment)) public salaryPayments;

  function settleInitialBalance(address _salaryId, bytes calldata _proofData, bytes32 _currentSalaryBalance) external {
    Zalary salaryContract = Zalary(_salaryId);
    salaryContract.settle(_proofData, _currentSalaryBalance, msg.sender);
    emit SettlementSuccesfull(msg.sender, salaryContract.employer(), _salaryId, block.timestamp);
  }

  function approveNoteAccess(bytes32 _note, string calldata _viewingKey, string calldata _sharedSecret, address _sharedWith) external {
    if (bytes(_viewingKey).length != 0) {
      _approveNoteAccess(_note, msg.sender, _viewingKey);
    }

    if (bytes(_sharedSecret).length != 0) {
      _approveNoteAccess(_note, _sharedWith, _sharedSecret);
    }
  }
}
