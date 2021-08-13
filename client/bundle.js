(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const {CONFIG} = require('./config');
// import { CONFIG } from './config';
App = {
	contracts: {},
	init: async () => {
		await App.loadWeb3();
		await App.loadAccount();
		await App.loadContract();
		await App.loadSudtContract();
		await App.renderBalance();
		await App.renderTasks();
	},
	loadWeb3: async () => {
		if (web3) {
			// Polyjuice provider config
			const providerConfig = {
				rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
				ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
				web3Url: CONFIG.WEB3_PROVIDER_URL
				};
				
			// Polyjuice provider
			App.web3Provider = new PolyjuiceHttpProvider(CONFIG.WEB3_PROVIDER_URL, providerConfig);
			web3 = new Web3(App.web3Provider);
		} else {
			alert("To use this DAPP you need setup godwoken network in your Metamask")
			console.log("No ethereum browser is installed. Try installing MetaMask");
		}
		  
	},
	loadAccount: async () => {
		const accounts = await window.ethereum.request({
			method: "eth_requestAccounts",
		});
		App.account = accounts[0];
	},

	// load already deployed contract by address, 
	// to deploy use: truffle migrate --network godwoken
	// 
	loadContract: async () => {
		try {
			const res = await fetch("TasksContract.json");
			const tasksContractJSON = await res.json();
			// Use CONFIG for contracts address
			App.tasksContract = new web3.eth.Contract(tasksContractJSON.abi, CONFIG.CONTRACT_ADDRESS);
			

			console.log('Task contract loaded:', App.tasksContract)
		} catch (error) {
			alert('Contract not found. Please deploy before continue')
			console.error('Cannot find deployed contract:', error);
		}
	},

	loadSudtContract: async () => {
		try {
			const res = await fetch("ERC20.json");
			const sudtContract = await res.json();
			// Use CONFIG for contracts address
			App.sudtContract = new web3.eth.Contract(sudtContract.abi, CONFIG.SUDT_ERC20_PROXY_ADDRESS);

			console.log('SUDT contract loaded:', App.sudtContract)
		} catch (error) {
			alert('Contract not found. Please deploy before continue')
			console.error('Cannot find deployed contract:', error);
		}
	},

  // render account balance as inner text
	renderBalance: async () => {
		const addressTranslator = new AddressTranslator();
		const polyjuiceAddress = addressTranslator.ethAddressToGodwokenShortAddress(App.account);
		const ckETHAddress = await addressTranslator.getLayer2DepositAddress(web3, App.account);
		
		const urlDeposit = "https://force-bridge-test.ckbapp.dev/bridge/Ethereum/Nervos?recipient=" + ckETHAddress.addressString
		
		const ckbShn = BigInt(await web3.eth.getBalance(App.account));
		const ckbBalance = parseInt(BigInt(ckbShn / 10n ** 8n));

		const ckEth = BigInt(await App.sudtContract.methods.balanceOf(polyjuiceAddress).call({
			from: App.account
		}));
		
		ckEthBalance = parseInt(BigInt(ckEth / 10n**8n));
		
		document.getElementById("account").innerText = App.account;
		document.getElementById("polyjuice-account").innerText = polyjuiceAddress;
		document.getElementById("ck-eth").innerText = ckETHAddress.addressString;
		// document.getElementById("ckb-balance").innerText = ckbBalance + " $CKB";
		document.getElementById("do-deposit").href = urlDeposit
		document.getElementById("ckb-balance").innerText = ckbBalance + " $CKB";
		document.getElementById("cketh-balance").innerText = ckEthBalance + " $ckETH";
		
		//   Copy address
		document.querySelector("#do-deposit").addEventListener("click", function copy() {
			var copyText = document.querySelector("#ck-eth");
			var elementText = copyText.textContent;
			navigator.clipboard.writeText(elementText);
		});

		// console.log(await App.sudtContract.methods.balanceOf(polyjuiceAddress).call({
		// 	from: App.account
		// }));
	},

	

  // render tasks
	renderTasks: async () => {
		const taskCounter = await App.tasksContract.methods.taskCounter().call(
			{
				from: App.account,
				...CONFIG.DEFAULT_SEND_OPTIONS ,
			}
		);
		const taskCounterNumber = parseInt(taskCounter);

		let html = "";

		for (let i = 1; i <= taskCounterNumber; i++) {
			const task = await App.tasksContract.methods.tasks(i).call({
				from: App.account,
				...CONFIG.DEFAULT_SEND_OPTIONS ,
			});
			const taskId = parseInt(task[0]);
			const taskTitle = task[1];
			const taskDescription = task[2];
			const taskDone = task[3];
			const taskCreatedAt = task[4];

			// Creating a task Card
			let taskElement = `
        <div class="card bg-light rounded-0 mb-2">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>${taskTitle}</span>
            <div class="form-check form-switch">
              <input class="form-check-input" data-id="${taskId}" type="checkbox" onchange="App.toggleDone(this)" ${
				taskDone === true && "checked"
			}>
            </div>
          </div>
          <div class="card-body">
            <span>${taskDescription}</span>
            
            <p class="text-muted">Task was created ${new Date(
							taskCreatedAt * 1000
						).toLocaleString()}</p>
            </label>
          </div>
        </div>
      `;
			html += taskElement;
		}

		document.querySelector("#tasksList").innerHTML = html;
	},
	createTask: async (title, description) => {
		try {
			const result = await App.tasksContract.methods.createTask(title, description).send({
				...CONFIG.DEFAULT_SEND_OPTIONS,
				from: App.account,
			});
			alert("Transaction completed, page will be reload.")
			window.location.reload();
		} catch (error) {
			console.error(error);
		}
	},
	toggleDone: async (element) => {
		const taskId = element.dataset.id;
		console.log(taskId)
		await App.tasksContract.methods.toggleDone(taskId).send({
			...CONFIG.DEFAULT_SEND_OPTIONS,
			from: App.account,
		});
		alert("Transaction completed, page will be reload.")
		window.location.reload();
	},
};

},{"./config":2}],2:[function(require,module,exports){
const CONFIG = {
    WEB3_PROVIDER_URL: 'https://godwoken-testnet-web3-rpc.ckbapp.dev',
    ROLLUP_TYPE_HASH: '0x4cc2e6526204ae6a2e8fcf12f7ad472f41a1606d5b9624beebd215d780809f6a',
    ETH_ACCOUNT_LOCK_CODE_HASH: '0xdeec13a7b8e100579541384ccaf4b5223733e4a5483c3aec95ddc4c1d5ea5b22',
    DEFAULT_SEND_OPTIONS: {
        gas: 6000000
    },
    CONTRACT_ADDRESS: '0x57a4d44de477A569766Ab934Fff38281d034f3EF',
    SUDT_ERC20_PROXY_ADDRESS: '0xD5A6a78E967cd70C6791d5289B3E4b1D5D55eC27'
    // SUDT_ID:152,
    // SUDT_NAME:'MyToken',
    // SUDT_SYMBOL:'MTK',
    // SUDT_TOTAL_SUPPLY: 9999999999

};

module.exports = {CONFIG}
},{}]},{},[1]);
