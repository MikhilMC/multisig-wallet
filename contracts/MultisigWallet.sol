// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @dev This is a multi signature wallet contract.
 * @author MikhilMC
 */
contract MultiSigWallet is ReentrancyGuard {
    event DepositAmount(address indexed sender, uint256 indexed amount);

    event SubmitTransactionProposal(uint256 indexed txId);
    event SupportTransactionProposal(
        address indexed owner,
        uint256 indexed txId
    );
    event OpposeTransactionProposal(
        address indexed owner,
        uint256 indexed txId
    );
    event ExecuteTransactionProposal(uint256 indexed txId);

    event SubmitCandidateProposal(uint256 indexed reqId);
    event SupportCandidateProposal(
        address indexed owner,
        uint256 indexed reqId
    );
    event OpposeCandidateProposal(address indexed owner, uint256 indexed reqId);
    event OwnerSelected(uint256 indexed reqId, address indexed newOwner);

    event SubmitRemovalProposal(uint256 indexed reqId);
    event SupportRemovalProposal(address indexed owner, uint256 indexed reqId);
    event OpposeRemovalProposal(address indexed owner, uint256 indexed reqId);
    event OwnerRemoved(uint256 indexed reqId, address indexed oldOwner);

    event SubmitNewRequiredVotesProposal(uint256 indexed reqId);
    event SupportNewRequiredVotesProposal(
        address indexed owner,
        uint256 indexed reqId
    );
    event OpposeNewRequiredVotesProposal(
        address indexed owner,
        uint256 indexed reqId
    );
    event RequiredVotesChanged(
        uint256 indexed reqId,
        uint256 indexed newRequiredVotes
    );

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        uint256 numberOfApprovals;
        uint256 startTime;
        uint256 endTime;
        bool executed;
    }

    struct Candidate {
        address candidateAddress;
        uint256 numberOfApprovals;
        uint256 startTime;
        uint256 endTime;
        bool selected;
    }

    struct OwnershipRemoval {
        address ownerAddress;
        uint256 numberOfApprovals;
        uint256 startTime;
        uint256 endTime;
        bool removed;
    }

    struct NewRequiredVote {
        uint256 newRequiredVotes;
        uint256 numberOfApprovals;
        uint256 startTime;
        uint256 endTime;
        bool changed;
    }

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public requiredVotes;

    Transaction[] public transactionProposals;
    mapping(uint256 => mapping(address => bool)) public supportTransaction;

    Candidate[] public candidateProposals;
    mapping(uint256 => mapping(address => bool)) public supportCandidate;
    mapping(address => bool) public isOwnershipCandidate;

    OwnershipRemoval[] public removalProposals;
    mapping(uint256 => mapping(address => bool)) public supportRemoval;
    mapping(address => bool) public isOwnershipRemovalCandidate;

    NewRequiredVote[] public requiredVotesProposals;
    mapping(uint256 => mapping(address => bool)) public supportRequiredVotes;

    /**@dev Modifier used for restricting access
     * only for the owners of the multi sig wallet
     */
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }

    /**@dev Modifier used for restricting access
     * only if the transaction data exists
     */
    modifier transactionProposalExists(uint256 _txId) {
        require(
            _txId < transactionProposals.length,
            "Transaction does not exists"
        );
        _;
    }

    /**@dev Modifier used for restricting access
     * only if the transaction is not approved by an owner
     */
    modifier transactionProposalNotSupported(uint256 _txId) {
        require(
            !supportTransaction[_txId][msg.sender],
            "Transaction already supported"
        );
        _;
    }

    /**@dev Modifier used for restricting access
     * only if the transaction is not executed
     */
    modifier transactionNotExecuted(uint256 _txId) {
        require(
            !transactionProposals[_txId].executed,
            "Transaction already executed"
        );
        _;
    }

    /**@dev Modifier used for restricting access
     * only if the candidate data exists
     */
    modifier candidateExists(uint256 _candidateId) {
        require(
            _candidateId < candidateProposals.length,
            "Candidate does not exists"
        );
        _;
    }

    /**@dev Modifier used for restricting access
     * only if the candidate is not supported by that owner
     */
    modifier candidateNotSupported(uint256 _candidateId) {
        require(
            !supportCandidate[_candidateId][msg.sender],
            "Candidate already supported"
        );
        _;
    }

    /**@dev Modifier used for restricting access
     * only if the candidate is not elected as a new owner
     */
    modifier candidateNotElected(uint256 _candidateId) {
        require(
            !candidateProposals[_candidateId].selected,
            "Candidate already elected"
        );
        _;
    }

    /**@dev Modifier used for restricting access
     * only if the removal proposal data for an owner exists
     */
    modifier removalProposalExists(uint256 _proposalId) {
        require(
            _proposalId < removalProposals.length,
            "Removal proposal does not exists"
        );
        _;
    }

    /**@dev Modifier used for restricting access
     * only if the removal proposal data for an owner
     * is not supported by that user
     */
    modifier removalProposalNotSupported(uint256 _proposalId) {
        require(
            !supportRemoval[_proposalId][msg.sender],
            "Removal proposal already approved"
        );
        _;
    }

    /**@dev Modifier used for restricting access
     * only if the removal proposal data for an owner
     * is not completed and that owner is not removed.
     */
    modifier ownerNotRemoved(uint256 _proposalId) {
        require(
            !removalProposals[_proposalId].removed,
            "Owner already removed"
        );
        _;
    }

    /**@dev Modifier used for restricting access
     * only if the data about the proposal for a
     * new required votes exists.
     */
    modifier newRequiredVotesProposalExists(uint256 _proposalId) {
        require(
            _proposalId < requiredVotesProposals.length,
            "New required votes proposal does not exists"
        );
        _;
    }

    /**@dev Modifier used for restricting access
     * only if the data about the proposal for a
     * new required votes is supported by that user.
     */
    modifier requiredVotesProposalNotApproved(uint256 _proposalId) {
        require(
            !supportRequiredVotes[_proposalId][msg.sender],
            "New required votes proposal already approved"
        );
        _;
    }

    /**@dev Modifier used for restricting access
     * only if the data about the proposal for a
     * new required votes is selected and
     * the required votes is changed.
     */
    modifier requiredVotesNotChanged(uint256 _proposalId) {
        require(
            !requiredVotesProposals[_proposalId].changed,
            "Required votes proposal already changed"
        );
        _;
    }

    /**@dev Creates a multi signature wallet.
     * @param _owners array of address of owners.
     * @param _required number required votes
     */
    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "Owners required");
        require(
            _required >= ((_owners.length / 2) + 1) &&
                _required < _owners.length,
            "Invalid number of required votes"
        );

        for (uint256 i; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "Zero address");
            require(!isOwner[owner], "Owner is not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        requiredVotes = _required;
    }

    /**@dev function to receive ether to the contract.*/
    receive() external payable {
        emit DepositAmount(msg.sender, msg.value);
    }

    // ---------------------START of Election for a transaction--------------

    /**@dev Submits the proposal for a new transaction to
     * the multi signature wallet contract.
     * Requirements:
     *
     * - Only the owners of the contract can call this function.
     *
     * @param _to address to which this transaction is going to execute
     * @param _value amount of ether wants to be sent with the transaction
     * @param _data bytes of the data which going to be executed
     * @param _timeDuration time duration given to the owners to make decision
     *        on the given transaction
     */
    function submitTransactionProposal(
        address _to,
        uint256 _value,
        bytes memory _data,
        uint256 _timeDuration
    ) external onlyOwner nonReentrant {
        require(_timeDuration > 0, "Zero time duration");
        transactionProposals.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                numberOfApprovals: 0,
                startTime: block.timestamp,
                endTime: block.timestamp + _timeDuration,
                executed: false
            })
        );

        emit SubmitTransactionProposal(transactionProposals.length - 1);
    }

    /**@dev Supports the proposal for a new transaction by an owner
     * Requirements:
     *
     * - Only the owners of the contract can call this function.
     * - The transaction proposal data must exist in the smart contract.
     * - The owner shouldn't have approved this transaction before.
     * - The transaction shouldn't have executed
     *
     * @param _txId index in which the transaction data
     *        lies in the transactions array
     */
    function supportTransactionProposal(uint256 _txId)
        external
        onlyOwner
        transactionProposalExists(_txId)
        transactionProposalNotSupported(_txId)
        transactionNotExecuted(_txId)
        nonReentrant
    {
        Transaction storage transaction = transactionProposals[_txId];
        require(transaction.endTime >= block.timestamp, "Time up!");
        supportTransaction[_txId][msg.sender] = true;
        transaction.numberOfApprovals += 1;
        emit SupportTransactionProposal(msg.sender, _txId);
        if (transaction.numberOfApprovals == requiredVotes) {
            (bool success, ) = transaction.to.call{value: transaction.value}(
                transaction.data
            );

            require(success, "Transaction failed");

            transaction.executed = true;

            emit ExecuteTransactionProposal(_txId);
        }
    }

    /**@dev Revoke the support for the proposal for a new transaction, by an owner
     * Requirements:
     *
     * - Only the owners of the contract can call this function.
     * - The transaction proposal data must exist in the smart contract.
     * - The owner should have approved this transaction before.
     * - The transaction shouldn't have executed
     *
     * @param _txId index in which the transaction data
     *        lies in the transactions array
     */
    function opposeTransactionProposal(uint256 _txId)
        external
        onlyOwner
        transactionProposalExists(_txId)
        transactionNotExecuted(_txId)
        nonReentrant
    {
        require(
            transactionProposals[_txId].endTime >= block.timestamp,
            "Time up!"
        );
        require(
            supportTransaction[_txId][msg.sender],
            "Transaction not approved"
        );
        transactionProposals[_txId].numberOfApprovals -= 1;
        supportTransaction[_txId][msg.sender] = false;
        emit OpposeTransactionProposal(msg.sender, _txId);
    }

    // ---------------------END of Election for a transaction--------------

    // ---------------------START of Election for a new owner--------------

    /**@dev Submits the proposal for a new owner to
     * the multi signature wallet contract.
     * Requirements:
     *
     * - Only the owners of the contract can call this function.
     * - The given candidate must not be a current owner.
     * - The time duration must not be 0.
     *
     * @param _candidate address of the new owner candidate
     * @param _timeDuration time duration given to the owners to make decision
     *        on the given owner candidate
     */
    function addOwnerCandidate(address _candidate, uint256 _timeDuration)
        external
        onlyOwner
        nonReentrant
    {
        require(_candidate != address(0), "Zero address");
        require(!isOwner[_candidate], "Already an owner");
        require(
            !isOwnershipCandidate[_candidate],
            "Already a candidate for ownership"
        );
        require(_timeDuration > 0, "Zero time duration");
        isOwnershipCandidate[_candidate] = true;
        candidateProposals.push(
            Candidate({
                candidateAddress: _candidate,
                numberOfApprovals: 0,
                startTime: block.timestamp,
                endTime: block.timestamp + _timeDuration,
                selected: false
            })
        );

        emit SubmitCandidateProposal(candidateProposals.length - 1);
    }

    /**@dev Supports the proposal for a new ownership candidate by an owner
     * Requirements:
     *
     * - Only the owners of the contract can call this function.
     * - The candidateship proposal data must exist in the smart contract.
     * - The owner shouldn't have approved this candidateship proposal before.
     * - The candidate shouldn't have selected as an owner
     *
     * @param _candidateId index in which the candidateship proposal data
     *        lies in the candidates array
     */
    function voteCandidate(uint256 _candidateId)
        external
        onlyOwner
        candidateExists(_candidateId)
        candidateNotSupported(_candidateId)
        candidateNotElected(_candidateId)
        nonReentrant
    {
        Candidate storage candidate = candidateProposals[_candidateId];
        require(candidate.endTime >= block.timestamp, "Time up!");
        supportCandidate[_candidateId][msg.sender] = true;
        candidate.numberOfApprovals += 1;
        emit SupportCandidateProposal(msg.sender, _candidateId);
        if (candidate.numberOfApprovals == requiredVotes) {
            candidate.selected = true;
            address newOwner = candidate.candidateAddress;
            owners.push(newOwner);
            isOwner[newOwner] = true;
            isOwnershipCandidate[newOwner] = false;
            if (requiredVotes == (owners.length / 2)) {
                requiredVotes += 1;
            }
            emit OwnerSelected(_candidateId, newOwner);
        }
    }

    /**@dev Revoke support for the proposal for a new
     *      ownership candidate by an owner
     * Requirements:
     *
     * - Only the owners of the contract can call this function.
     * - The candidateship proposal data must exist in the smart contract.
     * - The owner should have approved this candidateship proposal before.
     * - The candidate shouldn't have selected as an owner
     *
     * @param _candidateId index in which the candidateship proposal data
     *        lies in the candidates array
     */
    function rejectCandidate(uint256 _candidateId)
        external
        onlyOwner
        candidateExists(_candidateId)
        candidateNotElected(_candidateId)
        nonReentrant
    {
        require(
            candidateProposals[_candidateId].endTime >= block.timestamp,
            "Time up!"
        );
        require(
            supportCandidate[_candidateId][msg.sender],
            "Candidate not approved"
        );
        candidateProposals[_candidateId].numberOfApprovals -= 1;
        supportCandidate[_candidateId][msg.sender] = false;
        emit OpposeCandidateProposal(msg.sender, _candidateId);
    }

    // ---------------------END of Election for a new owner--------------

    // ---------------------START of Removal of a current owner--------------

    /**@dev Submits the proposal for removing a current owner from
     * the multi signature wallet contract.
     * Requirements:
     *
     * - Only the owners of the contract can call this function.
     * - The given address must be a current owner.
     * - The time duration must not be 0.
     *
     * @param _owner address of the current owner whom need to be removed.
     * @param _timeDuration time duration given to the owners to make decision
     *        on the given removal proposal of an owner.
     */
    function removeOwner(address _owner, uint256 _timeDuration)
        external
        onlyOwner
        nonReentrant
    {
        require(isOwner[_owner], "Not an owner");
        require(
            !isOwnershipRemovalCandidate[_owner],
            "Already a candidate for ownership removal"
        );
        require(_timeDuration > 0, "Zero time duration");
        isOwnershipRemovalCandidate[_owner] = true;
        removalProposals.push(
            OwnershipRemoval({
                ownerAddress: _owner,
                numberOfApprovals: 0,
                startTime: block.timestamp,
                endTime: block.timestamp + _timeDuration,
                removed: false
            })
        );

        emit SubmitRemovalProposal(removalProposals.length - 1);
    }

    /**@dev Supports the proposal for removing a current owner by an owner
     * Requirements:
     *
     * - Only the owners of the contract can call this function.
     * - The removal proposal data must exist in the smart contract.
     * - The owner shouldn't have approved this removal proposal before.
     * - The owner in the removal proposal must not be removed
     *   from the ownership position.
     *
     * @param _proposalId index in which the removal proposal data
     *        lies in the removalProposals array
     */
    function voteRemovalProposal(uint256 _proposalId)
        external
        onlyOwner
        removalProposalExists(_proposalId)
        removalProposalNotSupported(_proposalId)
        ownerNotRemoved(_proposalId)
        nonReentrant
    {
        OwnershipRemoval storage proposal = removalProposals[_proposalId];
        require(proposal.endTime >= block.timestamp, "Time up!");
        supportRemoval[_proposalId][msg.sender] = true;
        proposal.numberOfApprovals += 1;
        emit SupportRemovalProposal(msg.sender, _proposalId);
        if (proposal.numberOfApprovals == requiredVotes) {
            proposal.removed = true;
            address oldOwner = proposal.ownerAddress;
            _removeOwner(oldOwner);
            isOwner[oldOwner] = false;
            isOwnershipRemovalCandidate[oldOwner] = false;
            emit OwnerRemoved(_proposalId, oldOwner);
        }
    }

    /**@dev Removes the given owner from owners array
     *      and sets the ownership status of that address is set as false
     *
     * @param _owner address which need to be stripped
     *        from the ownership privilages.
     */
    function _removeOwner(address _owner) private {
        uint256 index;
        for (uint256 i; i < owners.length; i++) {
            if (_owner == owners[i]) {
                index = i;
                break;
            }
        }
        owners[index] = owners[owners.length - 1];
        owners.pop();
        if (requiredVotes == owners.length) {
            requiredVotes -= 1;
        }
    }

    /**@dev Revoke the support the proposal
     * for removing a current owner by an owner
     * Requirements:
     *
     * - Only the owners of the contract can call this function.
     * - The removal proposal data must exist in the smart contract.
     * - The owner should have approved this removal proposal before.
     * - The owner in the removal proposal must not be removed
     *   from the ownership position.
     *
     * @param _proposalId index in which the removal proposal data
     *        lies in the removalProposals array
     */
    function revokeRemovalSupport(uint256 _proposalId)
        external
        onlyOwner
        removalProposalExists(_proposalId)
        ownerNotRemoved(_proposalId)
        nonReentrant
    {
        require(
            removalProposals[_proposalId].endTime >= block.timestamp,
            "Time up!"
        );
        require(
            supportRemoval[_proposalId][msg.sender],
            "Ownership removal not approved"
        );
        removalProposals[_proposalId].numberOfApprovals -= 1;
        supportRemoval[_proposalId][msg.sender] = false;
        emit OpposeRemovalProposal(msg.sender, _proposalId);
    }

    // ---------------------END of Removal of a current owner--------------

    // ---------------START of Changing the required number of votes--------------

    /**@dev Submits the proposal for a new amount of required voted for
     * the multi signature wallet contract.
     * Requirements:
     *
     * - Only the owners of the contract can call this function.
     * - The given required votes must not be the current required amount.
     * - The given required votes must be greater than half of the
     *   length of the owners array.
     * - The given required votes must be less than the length of the owners array.
     * - The time duration must not be 0.
     *
     * @param _reqVotes amount of new required votes.
     * @param _timeDuration time duration given to the owners to make decision on the
     *        given proposal for deciding to change the required amount of votes.
     */
    function addNewRequiredVotes(uint256 _reqVotes, uint256 _timeDuration)
        external
        onlyOwner
        nonReentrant
    {
        require(_reqVotes != requiredVotes, "Already the same required votes");
        require(
            _reqVotes >= ((owners.length / 2) + 1) && _reqVotes < owners.length,
            "Invalid number of required votes"
        );
        require(_timeDuration > 0, "Zero time duration");
        requiredVotesProposals.push(
            NewRequiredVote({
                newRequiredVotes: _reqVotes,
                numberOfApprovals: 0,
                startTime: block.timestamp,
                endTime: block.timestamp + _timeDuration,
                changed: false
            })
        );

        emit SubmitNewRequiredVotesProposal(requiredVotesProposals.length - 1);
    }

    /**@dev Supports the proposal for the new required amount of votes by an owner
     * Requirements:
     *
     * - Only the owners of the contract can call this function.
     * - The proposal data for the new required amount of votes
     *   must exist in the smart contract.
     * - The owner shouldn't have approved this proposal
     *   for the new required amount of votes before.
     * - The amount in the proposal for the new required amount
     *   of votes must not be selected.
     *
     * @param _proposalId index in which the proposal data
     *        for the new required amount of votes lies in
     *        the requiredVotesProposals array
     */
    function approveNewRequiredVotes(uint256 _proposalId)
        external
        onlyOwner
        newRequiredVotesProposalExists(_proposalId)
        requiredVotesProposalNotApproved(_proposalId)
        requiredVotesNotChanged(_proposalId)
        nonReentrant
    {
        NewRequiredVote storage proposal = requiredVotesProposals[_proposalId];
        require(proposal.endTime >= block.timestamp, "Time up!");
        supportRequiredVotes[_proposalId][msg.sender] = true;
        proposal.numberOfApprovals += 1;
        emit SupportNewRequiredVotesProposal(msg.sender, _proposalId);
        if (proposal.numberOfApprovals == requiredVotes) {
            proposal.changed = true;
            uint256 reqVotes = proposal.newRequiredVotes;
            requiredVotes = reqVotes;
            emit RequiredVotesChanged(_proposalId, reqVotes);
        }
    }

    /**@dev Revoke support for the proposal for the new required amount
     *      of votes by an owner
     * Requirements:
     *
     * - Only the owners of the contract can call this function.
     * - The proposal data for the new required amount of votes
     *   must exist in the smart contract.
     * - The owner should have approved this proposal
     *   for the new required amount of votes before.
     * - The amount in the proposal for the new required amount
     *   of votes must not be selected.
     *
     * @param _proposalId index in which the proposal data
     *        for the new required amount of votes lies in
     *        the requiredVotesProposals array
     */
    function revokeNewRequiredVotes(uint256 _proposalId)
        external
        onlyOwner
        newRequiredVotesProposalExists(_proposalId)
        requiredVotesNotChanged(_proposalId)
        nonReentrant
    {
        require(
            requiredVotesProposals[_proposalId].endTime >= block.timestamp,
            "Time up!"
        );
        require(
            supportRequiredVotes[_proposalId][msg.sender],
            "New required votes proposal not approved"
        );
        requiredVotesProposals[_proposalId].numberOfApprovals -= 1;
        supportRequiredVotes[_proposalId][msg.sender] = false;
        emit OpposeNewRequiredVotesProposal(msg.sender, _proposalId);
    }

    // ---------------END of Changing the required number of votes--------------

    /**@dev Function to get the current time.*/
    // function getCurrentTime() public view returns (uint256) {
    //     return block.timestamp;
    // }
}
