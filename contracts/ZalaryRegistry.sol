pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/utils/Address.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract ZalaryRegistry is Ownable {

    using SafeMath for uint256;

    event AddEmployer(address indexed _employer, bytes32 _offChainHash);
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
    event WithdrawEmployerFunds(uint256 _amount, address _employer);

    struct Employer {
        uint256 id;
        bytes32 offChainHash;
        uint256 funds;  // This is the unused funds
    }

    struct Payment {
        address employer;
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
    mapping(address => mapping(address => uint256)) public paymentsSchedule;
    // employer -> recepients[]
    mapping(address => address[]) public recipentsByEmployer;
    // Cheque no. -> details
    mapping(uint256 => Payment) public payCheque;
    // employee -> Cheque no.
    mapping(address => uint256[]) employeePayCheque;

    constructor(address _paymentCurrency) public {
        // Right now we are only supporting DAI
        require(Address.isContract(_paymentCurrency), "Invalid currency Address");
        paymentCurrency = IERC20(_paymentCurrency);
    }

    function addEmployer(address _employer, bytes32 _offChainHash) external {
        require(_employer != address(0), "Invalid address");
        //require(_offChainHash.length > 0, "Invalid off chain data");
        require(employers[_employer].id == 0, "Already exists");
        employersList.push(_employer);
        // To access the right index always subtract 1 from id value
        employers[_employer] = Employer(employersList.length, _offChainHash, 0);
        emit AddEmployer(_employer, _offChainHash);
    }

    function removeEmployer(address _employer) external onlyOwner {
        uint256 id = employers[_employer].id;
        require(id != 0, "Not exist in the system");
        uint256 employersFunds = employers[_employer].funds;
        uint256 currentListLen = employersList.length;
        if (id < currentListLen) {
            employersList[id -1] = employersList[currentListLen - 1];
            employers[employersList[id -1]].id = id;
        }
        delete employers[_employer];
        employersList.length--;
        require(paymentCurrency.transfer(_employer, employersFunds));
    }

    function schedulePayment(address _employee, uint256 _startTime, uint256 _endTime, uint256 _amount) external {
        require(employers[msg.sender].id != 0, "Not authorised");
        require(_startTime >= now && _endTime > _startTime, "Invalid startTime and endTime");
        require(_amount != 0, "Invalid Amount");
        //require(employers[msg.sender].funds >= _amount, "Insufficent funds");
        lastChequeNo++;
        payCheque[lastChequeNo] = Payment(msg.sender, _employee, _startTime, _endTime, _amount, _startTime, 0);
        paymentsSchedule[msg.sender][_employee] = lastChequeNo;
        recipentsByEmployer[msg.sender].push(_employee);
        employeePayCheque[_employee].push(lastChequeNo);
        emit PaymentSchedule(_employee, msg.sender, lastChequeNo, _startTime, _endTime, _amount);
    }

    // Anybody can add funds
    function addFunds(uint256 _amount, address _employer) external {
        require(_amount != 0, "Invalid Amount");
        require(employers[_employer].id != 0, "Not authorised");
        require(paymentCurrency.transferFrom(msg.sender, address(this), _amount), "Insufficient funds allowed");
        employers[_employer].funds = employers[_employer].funds.add(_amount);
        emit AddFunds(msg.sender, _employer, _amount);
    }

    function withdrawPayment(uint256 _chequeNo, bool _allowDrained) external {
        require(_chequeNo <= lastChequeNo, "Invalid cheque");
        Payment storage payment = payCheque[_chequeNo];
        require(payment.amount > payment.releasedAmount, "Already dried");
        uint256 fundsPaid;
        // handling dust here
        if (payment.endTime >= now && _allowDrained) {
            fundsPaid = payment.amount.sub(payment.releasedAmount);
        } else {
            uint256 releasingSeconds = now.sub(payment.lastReleasingTime);
            uint256 elapsedTime = payment.endTime.sub(payment.startTime);
            fundsPaid = (payment.amount.mul(releasingSeconds)).div(elapsedTime);
        }
        payment.lastReleasingTime = now;
        payment.releasedAmount = payment.releasedAmount.add(fundsPaid);
        require(paymentCurrency.transfer(payment.receipient, fundsPaid), "Invalid transfer");
        employers[payment.employer].funds = employers[payment.employer].funds.sub(fundsPaid);
        emit WithdrawPayment(_chequeNo, fundsPaid, payment.receipient);
    }

    function withdrawEmployerFunds() external {
        require(employers[msg.sender].id != 0, "Not authorised");
        uint256 trasferFunds = employers[msg.sender].funds;
        employers[msg.sender].funds = 0;
        require(paymentCurrency.transfer(msg.sender, trasferFunds), "Invalid transfer");
        emit WithdrawEmployerFunds(trasferFunds, msg.sender);
    }

    function getEmployeeAllPayCheques(address _employee) external view returns(uint256[] memory){
        return employeePayCheque[_employee];
    }

    function getAllEmployeeByEmployer(address _employer) external view returns(address[] memory) {
        return recipentsByEmployer[_employer];
    }


}
