const { Connection, PublicKey, clusterApiUrl, Keypair, SystemProgram, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } = solanaWeb3;

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
const programId = new PublicKey('YourProgramID');  // Setzen Sie die Programm-ID

let baseAccount;

const initializeProgram = async () => {
    baseAccount = Keypair.generate();
    const airdropSignature = await connection.requestAirdrop(
        baseAccount.publicKey,
        LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSignature);

    const transaction = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: baseAccount.publicKey,
            newAccountPubkey: baseAccount.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(9000),
            space: 9000,
            programId: programId,
        })
    );

    const signature = await connection.sendTransaction(transaction, [baseAccount]);
    await connection.confirmTransaction(signature);

    console.log('Program initialized:', baseAccount.publicKey.toBase58());
    loadProposals();  // Laden Sie die Vorschläge nach der Initialisierung
};

const createProposal = async () => {
    const description = document.getElementById('proposal-description').value;
    if (!description) {
        alert('Please enter a proposal description');
        return;
    }

    const transaction = new Transaction().add(
        new TransactionInstruction({
            keys: [
                { pubkey: baseAccount.publicKey, isSigner: false, isWritable: true }
            ],
            programId: programId,
            data: Buffer.from(Uint8Array.of(1, ...new TextEncoder().encode(description))),  // 1 als Befehlscode für create_proposal
        })
    );

    const signature = await connection.sendTransaction(transaction, [baseAccount]);
    await connection.confirmTransaction(signature);

    console.log('Proposal created:', description);
    loadProposals();
};

const vote = async (voteFor) => {
    const proposalIndex = document.getElementById('proposal-list').value;
    if (proposalIndex === '') {
        alert('Please select a proposal to vote on');
        return;
    }

    const transaction = new Transaction().add(
        new TransactionInstruction({
            keys: [
                { pubkey: baseAccount.publicKey, isSigner: false, isWritable: true }
            ],
            programId: programId,
            data: Buffer.from(Uint8Array.of(2, proposalIndex, voteFor ? 1 : 0)),  // 2 als Befehlscode für vote, 1 für Ja, 0 für Nein
        })
    );

    const signature = await connection.sendTransaction(transaction, [baseAccount]);
    await connection.confirmTransaction(signature);

    console.log('Voted:', voteFor ? 'for' : 'against', 'proposal index:', proposalIndex);
    loadProposals();
};

const loadProposals = async () => {
    try {
        const accountInfo = await connection.getAccountInfo(baseAccount.publicKey);
        if (accountInfo === null) {
            console.log('Account not found');
            return;
        }

        const proposals = [];
        // Beispiel-Daten: Annahme, dass die Daten in einem eigenen Account gespeichert sind
        const data = Buffer.from(accountInfo.data);
        for (let i = 0; i < data.length; i += 33) {
            const description = new TextDecoder().decode(data.slice(i + 1, i + 33)).trim();
            const votesFor = data.readUInt32LE(i + 33);
            const votesAgainst = data.readUInt32LE(i + 37);
            proposals.push({ description, votesFor, votesAgainst });
        }

        renderProposals(proposals);
    } catch (error) {
        console.error('Failed to load proposals:', error);
    }
};

const renderProposals = (proposals) => {
    const proposalList = document.getElementById('proposal-list');
    proposalList.innerHTML = '';
    proposals.forEach((proposal, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = proposal.description;
        proposalList.appendChild(option);
    });

    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = '';
    proposals.forEach(proposal => {
        const li = document.createElement('li');
        li.textContent = `${proposal.description}: ${proposal.votesFor} for, ${proposal.votesAgainst} against`;
        resultsList.appendChild(li);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    initializeProgram();
});
