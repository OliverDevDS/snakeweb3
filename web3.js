// =============================================
// MULTI-CHAIN CONFIG
// =============================================

const CHAINS = {
    robinhood: {
        id: "robinhood",
        label: "Robinhood Chain",
        chainId: "0xB626",         // 46630 decimal
        chainIdDec: 46630,
        chainName: "Robinhood Chain Testnet",
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://rpc.testnet.chain.robinhood.com"],
        blockExplorerUrls: ["https://explorer.testnet.chain.robinhood.com"],
        spinCost: "0.00001",       // ETH
        spinCostDisplay: "~0.00001 ETH",
        color: "#00ff44",
        icon: "🏹"
    },
    arc: {
        id: "arc",
        label: "Arc Testnet",
        chainId: "0x4cef52",       // 5042002 decimal
        chainIdDec: 5042002,
        chainName: "Arc Network Testnet",
        nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
        rpcUrls: ["https://rpc.testnet.arc.network"],
        blockExplorerUrls: ["https://testnet.arcscan.app"],
        spinCost: "0.0001",        // USDC
        spinCostDisplay: "~0.0001 USDC",
        color: "#00c8ff",
        icon: "🌐"
    }
};

// Contract addresses per chain (deploy same contract on Arc too, update address)
const CONTRACT_ADDRESSES = {
    robinhood: "0x99dDB0DfaEDC80465474A28609c8419Dbb17Efa0",
    arc:       "0x8B1C92BDe589FbbB66Dcb454895bE1daF9cacd89"
};

const ABI = [
    "function nicknames(address) public view returns (string)",
    "function registerNickname(string memory _name) public",
    "function spinRoulette() public payable",
    "function moves(address) public view returns (uint256)",
    "function submitScore(uint256 score) public",
    "function leaderboard(uint256) public view returns (address player, string nickname, uint256 score)",
    "function getLeaderboardLength() public view returns (uint256)"
];

// ─── Active chain state ───────────────────────────────────────────────────────
window.activeChain = CHAINS.robinhood; // default

function setActiveChain(chainId) {
    const found = Object.values(CHAINS).find(c => c.chainIdDec === chainId);
    if (found) {
        window.activeChain = found;
        updateChainUI();
    }
}

function updateChainUI() {
    const chain = window.activeChain;
    const badge = document.getElementById("chainBadge");
    const spinCostEl = document.getElementById("spinCost");
    const chainSelectorBtns = document.querySelectorAll(".chain-btn");

    if (badge) {
        badge.textContent = `${chain.icon} ${chain.label}`;
        badge.style.color = chain.color;
        badge.style.borderColor = chain.color;
        badge.style.boxShadow = `0 0 12px ${chain.color}40`;
    }
    if (spinCostEl) spinCostEl.textContent = `Cost: ${chain.spinCostDisplay}`;

    document.documentElement.style.setProperty("--accent", chain.color);
    document.documentElement.style.setProperty("--green", chain.color);

    chainSelectorBtns.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.chain === chain.id);
    });
}

// ─── Switch network ───────────────────────────────────────────────────────────
async function ensureChain(chainConfig) {
    if (typeof window.ethereum === "undefined") throw new Error("MetaMask not found!");

    try {
        await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
                chainId: chainConfig.chainId,
                chainName: chainConfig.chainName,
                nativeCurrency: chainConfig.nativeCurrency,
                rpcUrls: chainConfig.rpcUrls,
                blockExplorerUrls: chainConfig.blockExplorerUrls
            }]
        });
    } catch (e) { /* already exists */ }

    await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainConfig.chainId }]
    });

    await new Promise(r => setTimeout(r, 600));

    const chainHex = await window.ethereum.request({ method: "eth_chainId" });
    const chainId = parseInt(chainHex, 16);
    if (chainId !== chainConfig.chainIdDec) {
        throw new Error(`Wrong network! Expected ${chainConfig.chainName} (${chainConfig.chainIdDec}), got ${chainId}.`);
    }
    setActiveChain(chainId);
}

async function getReadyContract(chainConfig) {
    chainConfig = chainConfig || window.activeChain;
    await ensureChain(chainConfig);
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const addr = CONTRACT_ADDRESSES[chainConfig.id];
    const contract = new ethers.Contract(addr, ABI, signer);
    return { contract, signer };
}

// ─── Chain Selector ───────────────────────────────────────────────────────────
window.switchChain = async function(chainId) {
    const chain = CHAINS[chainId];
    if (!chain) return;
    try {
        setStatus(`Switching to ${chain.label}...`, "info");
        await ensureChain(chain);
        setStatus(`Connected to ${chain.label}!`, "ok");
        await updateStepsUI();
        loadLeaderboard();
        if (window.onChainSwitch) window.onChainSwitch(chain);
    } catch (e) {
        setStatus("Switch error: " + (e.message || e), "error");
    }
};

// ─── Connect Wallet ────────────────────────────────────────────────────────────
async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
        return alert("MetaMask not found! Install it at metamask.io");
    }
    try {
        setStatus("Connecting...", "info");
        await window.ethereum.request({ method: "eth_requestAccounts" });

        // Detect current chain
        const chainHex = await window.ethereum.request({ method: "eth_chainId" });
        const chainId = parseInt(chainHex, 16);
        const knownChain = Object.values(CHAINS).find(c => c.chainIdDec === chainId);

        let targetChain = window.activeChain;
        if (knownChain) {
            targetChain = knownChain;
            window.activeChain = knownChain;
        }

        const { contract, signer } = await getReadyContract(targetChain);
        const address = await signer.getAddress();
        const nickname = await contract.nicknames(address);

        document.getElementById("connectBtn").style.display = "none";
        document.getElementById("walletInfo").style.display = "flex";
        document.getElementById("walletAddr").innerText =
            address.substring(0, 6) + "..." + address.slice(-4);

        updateChainUI();

        if (!nickname || nickname === "") {
            document.getElementById("nicknameModal").style.display = "block";
            setStatus("Register your nickname to play!", "warn");
        } else {
            document.getElementById("playerName").innerText = " ⚔️ " + nickname;
            setStatus(`Ready to play on ${targetChain.label}!`, "ok");
            if (window.startGameLoop) window.startGameLoop();
        }

        await updateStepsUI();
        loadLeaderboard();

        window.ethereum.on("accountsChanged", () => location.reload());
        window.ethereum.on("chainChanged", (hex) => {
            const cid = parseInt(hex, 16);
            setActiveChain(cid);
            updateStepsUI();
            loadLeaderboard();
        });

    } catch (err) {
        console.error(err);
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
        const chain = window.activeChain;
        const provider = new ethers.JsonRpcProvider(chain.rpcUrls[0]);
        const readContract = new ethers.Contract(CONTRACT_ADDRESSES[chain.id], ABI, provider);
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
        const chain = window.activeChain;
        setStatus(`Switching to ${chain.label}...`, "info");
        const { contract } = await getReadyContract();
        setStatus("Sending spin transaction...", "info");
        const tx = await contract.spinRoulette({ value: ethers.parseEther(chain.spinCost) });
        setStatus("Waiting for confirmation...", "info");
        await tx.wait();
        await updateStepsUI();
        setStatus("🎉 Wheel spun! Moves added.", "ok");
        if (window.onSpinSuccess) window.onSpinSuccess();
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
        setStatus("Saving score on blockchain...", "info");
        const { contract } = await getReadyContract();
        const tx = await contract.submitScore(scoreValue);
        await tx.wait();
        setStatus("✅ Score " + scoreValue + " saved to the leaderboard!", "ok");
        loadLeaderboard();
    } catch (e) {
        console.error(e);
        setStatus("Error saving score: " + (e.reason || e.message), "error");
    }
};

// ─── Load Leaderboard ─────────────────────────────────────────────────────────
async function loadLeaderboard() {
    const list = document.getElementById("leaderboardList");
    try {
        const chain = window.activeChain;
        const provider = new ethers.JsonRpcProvider(chain.rpcUrls[0]);
        const readContract = new ethers.Contract(CONTRACT_ADDRESSES[chain.id], ABI, provider);
        list.innerHTML = "<li style='opacity:0.5;justify-content:center'>Loading...</li>";
        const len = Number(await readContract.getLeaderboardLength());
        if (len === 0) {
            list.innerHTML = "<li style='opacity:0.5;justify-content:center'>No scores yet!</li>";
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
            li.innerHTML = `<span class="lb-rank">${medal}</span><span class="lb-name">${entry.nickname}</span><span class="lb-score">${entry.score}</span>`;
            list.appendChild(li);
        });
    } catch (e) {
        console.error("Leaderboard error:", e);
        list.innerHTML = "<li style='color:#f55;justify-content:center'>Error loading</li>";
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
    // Auto-clear ok messages
    if (type === "ok") {
        clearTimeout(el._timeout);
        el._timeout = setTimeout(() => { el.innerText = ""; }, 5000);
    }
}
window.setStatus = setStatus;
