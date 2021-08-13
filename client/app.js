const {CONFIG} = require('./config');
// import { CONFIG } from './config';
App = {
	contracts: {},
	init: async () => {
		await App.loadWeb3();
		await App.loadAccount();
		await App.loadContract();
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
			// Use CONFIG for contract address
			App.tasksContract = new web3.eth.Contract(tasksContractJSON.abi, CONFIG.CONTRACT_ADDRESS);

			console.log('Contract loaded:', App.tasksContract)
		} catch (error) {
			alert('Contract not found. Please deploy before continue')
			console.error('Cannot find deployed contract:', error);
		}
	},

  // render account balance as inner text
	renderBalance: async () => {
		const addressTranslator = new AddressTranslator();
		const polyjuiceAddress = addressTranslator.ethAddressToGodwokenShortAddress(App.account);
		document.getElementById("account").innerText = App.account;
		document.getElementById("polyjuice-account").innerText = polyjuiceAddress;
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
