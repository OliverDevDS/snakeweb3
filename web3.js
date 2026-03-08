// Substitua pelo endereço do seu contrato após o deploy com --broadcast
const contractAddress = "0x99dDB0DfaEDC80465474A28609c8419Dbb17Efa0"; 
const abi = [
    "function nicknames(address) public view returns (string)",
    "function registerNickname(string memory _name) public",
    "function spinRoulette() public payable",
    "function moves(address) public view returns (uint256)",
    "function submitScore(uint256 score) public",
    "function leaderboard(uint256) public view returns (address player, string nickname, uint256 score)",
    "function getLeaderboardLength() public view returns (uint256)"
];

let contract; // Global
let signer;   // Global

window.connectWallet = async function() {
    if (!window.ethereum) return alert("Install MetaMask!");
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    signer = await provider.getSigner();
    contract = new ethers.Contract(contractAddress, abi, signer); // Inicializa a global

    const address = accounts[0];
    const nickname = await contract.nicknames(address);

    document.getElementById("connectBtn").style.display = "none";
    document.getElementById("walletInfo").style.display = "block";
    document.getElementById("walletAddr").innerText = address.substring(0,6) + "...";

    if (!nickname || nickname === "") {
        document.getElementById("nicknameModal").style.display = "block";
    } else {
        document.getElementById("playerName").innerText = "| Player: " + nickname;
        if (typeof window.startGameLoop === "function") window.startGameLoop(); // Destrava o jogo
    }
    
    await updateStepsUI();
    loadLeaderboard();
};

window.saveNickname = async function() {
    const name = document.getElementById("nickInput").value;
    if (!name) return alert("Enter a nickname!");
    try {
        const tx = await contract.registerNickname(name);
        await tx.wait();
        document.getElementById("nicknameModal").style.display = "none";
        document.getElementById("playerName").innerText = "| Player: " + name;
        window.startGameLoop();
    } catch (e) { console.error(e); }
};

window.web3Spin = async function() {
    if (!contract) return alert("Connect your wallet first!");
    try {
        const tx = await contract.spinRoulette({ value: ethers.parseEther("0.00001") }); //
        await tx.wait();
        await updateStepsUI();
    } catch (e) { console.error(e); }
};

window.web3Submit = async function(scoreValue) {
    if (!contract) return alert("Wallet not connected!"); //
    try {
        const tx = await contract.submitScore(scoreValue); //
        await tx.wait();
        alert("Record saved!");
        loadLeaderboard();
    } catch (e) { console.error(e); }
};

async function updateStepsUI() {
    const addr = await signer.getAddress();
    const m = await contract.moves(addr);
    window.steps = Number(m); // Sincroniza com a variável do game.js
    document.getElementById("steps").innerText = window.steps;
}

async function loadLeaderboard() {
    const list = document.getElementById("leaderboardList");
    const len = await contract.getLeaderboardLength();
    list.innerHTML = "";
    for(let i = Number(len)-1; i >= 0 && i >= Number(len)-10; i--) {
        const entry = await contract.leaderboard(i);
        const li = document.createElement("li");
        li.innerText = `${entry.nickname}: ${entry.score} pts`;
        list.appendChild(li);
    }
}