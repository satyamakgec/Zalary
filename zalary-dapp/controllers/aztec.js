async initWeb3Service() {
    await Web3Service.init(USE_HOT_WALLET);

    if (USE_HOT_WALLET && !AuthService.isLoggedIn) {
      if (this.aboutToUnmount) return;
      this.setState({
        showLogin: true,
      });
      return;
    }

    await Web3Service.registerContract(LoanDapp);
    await Web3Service.registerContract(ACE);
    await Web3Service.registerContract(JoinSplit);

    await Web3Service.registerInterface(ZKERC20);
    await Web3Service.registerInterface(SettlementToken);
    await Web3Service.registerInterface(Loan);

    const currentAddress = Web3Service.getAddress();

    await CurrencyService.initAddresses();

    Web3Service.onAddressChanged(this.handleChangeAddress);

    if (this.aboutToUnmount) return;
    this.setState({
      isWeb3Loaded: true,
      showLogin: false,
      currentAddress,
    });
  }
