// =============================================
// ROBINHOOD CHAIN TESTNET CONFIG
// Chain ID: 46630 (0xB656)
// =============================================
const ROBINHOOD_CHAIN = {
    chainId: "0xB626",       // 46630 decimal
    chainName: "Robinhood Chain Testnet",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://rpc.testnet.chain.robinhood.com"],
    blockExplorerUrls: ["https://explorer.testnet.chain.robinhood.com"]
};

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

// ─── Switch network then return a FRESH contract+signer ───────────────────────
async function ensureRobinhoodChain() {
    if (typeof window.ethereum === "undefined") throw new Error("MetaMask not found!");

    // Add network if not present
    try {
        await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [ROBINHOOD_CHAIN]
        });
    } catch (e) { /* already exists, ignore */ }

    // Switch to it
    await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ROBINHOOD_CHAIN.chainId }]
    });

    // Wait a tick for MetaMask to fully apply the chain switch
    await new Promise(r => setTimeout(r, 500));

    // Verify chain ID is correct before proceeding
    const chainHex = await window.ethereum.request({ method: "eth_chainId" });
    const chainId = parseInt(chainHex, 16);
    if (chainId !== 46630) {
        throw new Error(`Wrong network! Expected Robinhood Chain (46630), got ${chainId}. Please switch manually in MetaMask.`);
    }
}

async function getReadyContract() {
    await ensureRobinhoodChain();

    // Create fresh provider+signer AFTER confirmed chain switch
    const provider = new ethers.BrowserProvider(window.ethereum);
    const freshSigner = await provider.getSigner();
    const freshContract = new ethers.Contract(contractAddress, abi, freshSigner);
    return { contract: freshContract, signer: freshSigner };
}

// ─── Connect Wallet ────────────────────────────────────────────────────────────
async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
        return alert("MetaMask not found! Install it at metamask.io");
    }
    try {
        setStatus("Connecting...", "info");
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const { contract, signer } = await getReadyContract();

        const address = await signer.getAddress();
        const nickname = await contract.nicknames(address);

        document.getElementById("connectBtn").style.display = "none";
        document.getElementById("walletInfo").style.display = "flex";
        document.getElementById("walletAddr").innerText =
            address.substring(0, 6) + "..." + address.slice(-4);

        if (!nickname || nickname === "") {
            document.getElementById("nicknameModal").style.display = "block";
            setStatus("Register your nickname to play!", "warn");
        } else {
            document.getElementById("playerName").innerText = " ⚔️ " + nickname;
            setStatus("Ready to play!", "ok");
            if (window.startGameLoop) window.startGameLoop();
        }

        await updateStepsUI();
        loadLeaderboard();

        window.ethereum.on("accountsChanged", () => location.reload());
        window.ethereum.on("chainChanged",    () => location.reload());

    } catch (err) {
        console.error("Connection error:", err);
        setStatus("Error: " + (err.message || err), "error");
    }
}
window.connectWallet = connectWallet;

// ─── Save Nickname ─────────────────────────────────────────────────────────────
async function saveNickname() {
    const nick = document.getElementById("nickInput").value.trim();
    if (!nick || nick.length < 2) return alert("Nickname must be at least 2 characters!");

    const btn = document.querySelector("#nicknameModal button");
    btn.disabled = true;
    btn.innerText = "Registering...";
    try {
        setStatus("Registering nickname on blockchain...", "info");
        const { contract } = await getReadyContract();
        const tx = await contract.registerNickname(nick);
        await tx.wait();
        document.getElementById("nicknameModal").style.display = "none";
        document.getElementById("playerName").innerText = " ⚔️ " + nick;
        setStatus("Nickname registered! Good luck!", "ok");
        if (window.startGameLoop) window.startGameLoop();
        loadLeaderboard();
    } catch (e) {
        console.error(e);
        setStatus("Registration error: " + (e.reason || e.message), "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Register on Chain";
    }
}
window.saveNickname = saveNickname;

// ─── Update Steps UI ──────────────────────────────────────────────────────────
async function updateStepsUI() {
    try {
        const provider = new ethers.JsonRpcProvider("https://rpc.testnet.chain.robinhood.com");
        const readContract = new ethers.Contract(contractAddress, abi, provider);
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (!accounts.length) return;
        const m = await readContract.moves(accounts[0]);
        window.steps = Number(m);
        document.getElementById("steps").innerText = window.steps;
    } catch (e) {
        console.log("updateStepsUI error:", e);
    }
}

// ─── Spin Wheel ────────────────────────────────────────────────────────────────
window.web3Spin = async function () {
    const btn = document.getElementById("spinBtn");
    btn.disabled = true;
    btn.innerText = "🎰 Spinning...";
    try {
        setStatus("Switching to Robinhood Chain...", "info");
        const { contract } = await getReadyContract();
        setStatus("Sending spin transaction...", "info");
        const tx = await contract.spinRoulette({ value: ethers.parseEther("0.00001") });
        setStatus("Waiting for confirmation...", "info");
        await tx.wait();
        await updateStepsUI();
        setStatus("🎉 Wheel spun! Moves added.", "ok");
    } catch (e) {
        console.error(e);
        setStatus("Wheel error: " + (e.reason || e.message || String(e)), "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "🎰 Spin the Wheel";
    }
};

// ─── Submit Score ──────────────────────────────────────────────────────────────
window.web3Submit = async function (scoreValue) {
    try {
        setStatus("Switching to Robinhood Chain...", "info");
        const { contract } = await getReadyContract();
        setStatus("Saving score on blockchain...", "info");
        const tx = await contract.submitScore(scoreValue);
        await tx.wait();
        setStatus("✅ Score " + scoreValue + " saved to the leaderboard!", "ok");
        loadLeaderboard();
    } catch (e) {
        console.error(e);
        setStatus("Error saving score: " + (e.reason || e.message), "error");
    }
};

// ─── Load Leaderboard (read-only via RPC) ─────────────────────────────────────
async function loadLeaderboard() {
    const list = document.getElementById("leaderboardList");
    try {
        const provider = new ethers.JsonRpcProvider("https://rpc.testnet.chain.robinhood.com");
        const readContract = new ethers.Contract(contractAddress, abi, provider);
        list.innerHTML = "<li style='opacity:0.5'>Loading...</li>";
        const len = Number(await readContract.getLeaderboardLength());
        if (len === 0) {
            list.innerHTML = "<li style='opacity:0.5'>No scores yet!</li>";
            return;
        }
        const entries = [];
        const start = Math.max(0, len - 20);
        for (let i = len - 1; i >= start; i--) {
            const entry = await readContract.leaderboard(i);
            entries.push({ nickname: entry.nickname, score: Number(entry.score) });
        }
        entries.sort((a, b) => b.score - a.score);
        list.innerHTML = "";
        const medals = ["🥇", "🥈", "🥉"];
        entries.slice(0, 10).forEach((entry, idx) => {
            const li = document.createElement("li");
            const medal = medals[idx] || "#" + (idx + 1);
            li.innerHTML = '<span class="lb-rank">' + medal + '</span> <span class="lb-name">' + entry.nickname + '</span> <span class="lb-score">' + entry.score + '</span>';
            list.appendChild(li);
        });
    } catch (e) {
        console.error("Leaderboard error:", e);
        list.innerHTML = "<li style='color:#f55'>Error loading leaderboard</li>";
    }
}
window.loadLeaderboard = loadLeaderboard;

// ─── Status Helper ─────────────────────────────────────────────────────────────
function setStatus(msg, type) {
    type = type || "info";
    const el = document.getElementById("statusMsg");
    if (!el) return;
    const colors = { info: "#0af", ok: "#0f0", warn: "#ff0", error: "#f55" };
    el.style.color = colors[type] || "#0f0";
    el.innerText = msg;
}
