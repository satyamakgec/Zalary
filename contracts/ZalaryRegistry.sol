pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/utils/Address.sol";

contract ZalaryRegistry is Ownable {

    event AddEmployer(address indexed _employer, bytes _offChainHash);
    event PaymentSchedule(
        address indexed _employee,
        address indexed _employer,
        uint256 indexed chequeNo,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _amount
    );
    event AddFunds(address _who, address indexed _employer, uint256 _funds);
    event WithdrawPayment(uint256 _chequeNo, uint256 amount, address receipient);

    struct Employer {
        uint256 id;
        bytes offChainHash;
        uint256 funds;  // This is the unused funds
    }

    struct Payment {
        address from;
        address receipient;
        uint256 startTime;
        uint256 endTime;
        uint256 amount;
        uint256 lastReleasingTime;
        uint256 releasedAmount; 
    }

    // Storage
    mapping(address => Employer) public employers;
    address[] public employersList;

    IERC20 paymentCurrency;

    // Cheque no.
    uint256 lastChequeNo; 
    // Storage for payment
    mapping(address => mapping(address => uint256)) paymentsSchedule;
    // employer -> recepients[]
    mapping(address => address[]) public recipentsByEmployer;
    // Cheque no. -> details
    mapping(uint256 => Payment) payCheque;
    // employee -> Cheque no.
    mapping(address => uint256[]) public employeePayCheque; 

    constructor(address _paymentCurrency) public {
        // Right now we are only supporting DAI
        require(Address.isContract(_paymentCurrency), "Invalid currency Address");
        paymentCurrency = IERC20(_paymentCurrency);
    }

    function addEmployer(address _employer, bytes _offChainHash) external onlyOwner {
        require(_employer != address(0), "Invalid address");
        require(_offChainHash.length > 0, "Invalid off chain data");
        require(employers[_employer].id != 0, "Already exists");
        employersList.push(_employer);
        // To access the right index always subtract 1 from id value
        employers[_employer] = Employer(employersList.length, _offChainHash, 0);
        emit AddEmployer(_employer, _offChainHash);
    }

    function removeEmployer(address _employer) external onlyOwner {
        uint256 id = employers[_employer].id;
        require(id != 0, "Not exist in the system");
        uint256 currentListLen = employersList.length;
        if (id < currentListLen) {
            employersList[id -1] = employersList[currentListLen - 1];
            employers[employersList[id -1]].id = id;
        }
        delete employers[_employer];
        employersList.length--;
    }

    function schedulePayment(address _employee, uint256 _startTime, uint256 _endTime, uint256 _amount) external {
        require(employers[msg.sender].id != 0, "Not authorised");
        require(_startTime >= now && _endTime > _startTime, "Invalid startTime and endTime");
        require(_amount != 0, "Invalid Amount");
        require(employers[msg.sender].funds >= _amount, "Insufficent funds");
        lastChequeNo++;
        payCheque[lastChequeNo] = Payment(_employee, _startTime, _endTime, _amount, _startTime);
        paymentsSchedule[msg.sender][_employee] = lastChequeNo;
        recipentsByEmployer[msg.sender].push(_employee);
        employeePayCheque[_employee].push(lastChequeNo);
        emit PaymentSchedule(_employee, msg.sender, lastChequeNo, _startTime, _endTime, _amount);
    }

    // Anybody can add funds
    function addFunds(uint256 _amount, uint256 _employer) external {
        require(_amount != 0, "Invalid Amount");
        require(employers[_employer].id != 0, "Not authorised");
        require(paymentCurrency.transferFrom(msg.sender, address(this), _amount), "Insufficient funds allowed");
        employers[_employer].funds = employers[_employer].funds.add(_amount);
        emit AddFunds(msg.sender, _employer, _amount);
    }

    function withdrawPayment(uint256 _chequeNo, bool _allowDrained) external {
        require(_chequeNo <= lastChequeNo, "Invalid cheque");
        Payment storage _payment = payCheque[_chequeNo];
        require(_payment.amount >= _payment.releasedAmount, "Already dried");
        uint256 releasingSeconds = now.sub(_payment.lastReleasingTime);
        uint256 ratio = _payment.amount.div(_payment.endTime.sub(_payment.startTime));
        
        uint256 fundsPayed = releasingSeconds.mul(ratio);
        // handling dust here
        if (_payment.endTime >= now && _allowDrained) {
            fundsPayed = _payment.amount.sub(_payment.releasedAmount);
        }
        _payment.lastReleasingTime = now;
        _payment.releasedAmount = _payment.releasedAmount.add(fundsPayed);
        require(paymentCurrency.transfer(_payment.receipient, fundsPayed), "Invalid transfer");
        employers[_payment.from].funds = employers[_payment.from].funds.sub(fundsPayed);
        emit WithdrawPayment(_chequeNo, fundsPayed, _payment.receipient);
    }

}