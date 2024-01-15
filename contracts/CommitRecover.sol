// SPDX-License-Identifier: MIT

pragma solidity ^0.8.23;

import "./libraries/BigNumbers.sol";

/**
 * @title Bicorn-RX Commit-Reveal-Recover
 * @author Justin g
 * @notice This contract is for generating random number
 *    1. Finished: Not SetUped | Calculate or recover the random number
 *    2. Commit: participants commit their value
 *    3. Reveal: participants reveal their value
 */
contract CommitRecover {
    using BigNumbers for *;
    bytes private constant MODFORHASH =
        hex"0000000000000000000000000000000100000000000000000000000000000000";
    uint256 private constant MODFORHASH_LEN = 129;
    uint256 private constant ZERO = 0;
    uint256 private constant ONE = 1;
    /* Type declaration */
    /**
     * @notice Stages of the contract
     * @notice Recover can be performed in the Reveal and Finished stages.
     */
    enum Stages {
        Finished,
        Commit,
        Reveal
    }
    struct VDFClaim {
        uint256 T;
        BigNumber x;
        BigNumber y;
        BigNumber v;
    }
    struct SetUpValueAtRound {
        uint256 setUpTime; //setUp time of the round
        uint256 commitDuration; // commit period
        uint256 commitRevealDuration; // commit + reveal period, commitRevealDuration - commitDuration => revealDuration
        uint256 T;
        uint256 proofSize;
        BigNumber n;
        BigNumber g; // a value generated from the generator list
        BigNumber h; // a value generated from the VDF(g)
    }
    struct ValueAtRound {
        uint256 numOfParticipants; // number of participants
        uint256 count; //This variable is used to keep track of the number of commitments and reveals, and to check if anything has been committed when moving to the reveal stage.
        bytes bStar; // hash of commitsString
        bytes commitsString; // concatenated string of commits
        BigNumber omega; // the random number
        Stages stage; // stage of the contract
        bool isCompleted; // omega is finialized when this is true
        bool isAllRevealed; // true when all participants have revealed
    }
    struct CommitRevealValue {
        BigNumber c;
        BigNumber a;
        address participantAddress;
    }
    struct UserAtRound {
        uint256 index; // index of the commitRevealValues
        bool committed; // true if committed
        bool revealed; // true if revealed
    }
    /* State variables */
    uint256 private nextRound;
    mapping(uint256 round => SetUpValueAtRound) private setUpValuesAtRound;
    mapping(uint256 round => ValueAtRound) private valuesAtRound;
    mapping(uint256 round => mapping(uint256 index => CommitRevealValue))
        private commitRevealValues;
    mapping(address owner => mapping(uint256 round => UserAtRound)) private userInfosAtRound;

    /* Events */
    event CommitC(
        address participant,
        BigNumber commit,
        bytes commitsString,
        uint256 commitCount,
        uint256 commitTimestamp
    );
    event RevealA(
        address participant,
        BigNumber a,
        uint256 revealLeftCount,
        uint256 revealTimestamp
    );
    event Recovered(
        address msgSender,
        BigNumber recov,
        BigNumber omegaRecov,
        uint256 recoveredTimestamp
    );
    event SetUp(
        address msgSender,
        uint256 setUpTime,
        uint256 commitDuration,
        uint256 commitRevealDuration,
        BigNumber n,
        BigNumber g,
        BigNumber h,
        uint256 T,
        uint256 round
    );
    event CalculatedOmega(uint256 round, BigNumber omega, uint256 calculatedTimestamp);

    /* Errors */
    error AlreadyCommitted();
    error NotCommittedParticipant();
    error AlreadyRevealed();
    error ModExpRevealNotMatchCommit();
    error NotAllRevealed();
    error OmegaAlreadyCompleted();
    error FunctionInvalidAtThisStage();
    error TNotMatched();
    error NotVerified();
    error RecovNotMatchX();
    error StageNotFinished();
    error CommitRevealDurationLessThanCommitDuration();
    error AllFinished();
    error NoneParticipated();
    error ShouldNotBeZero();

    /* Functions */
    /**
     * @param _c participant's commit value
     * @notice Commit function
     * @notice The participant's commit value must be less than the modulor
     * @notice The participant can only commit once
     * @notice check period, update stage if needed, revert if not currently at commit stage
     */
    function commit(uint256 _round, BigNumber memory _c) external {
        if (_c.isZero()) revert ShouldNotBeZero();
        if (userInfosAtRound[msg.sender][_round].committed) revert AlreadyCommitted();
        checkStage(_round);
        equalStage(_round, Stages.Commit);
        uint256 _count = valuesAtRound[_round].count;
        bytes memory _commitsString = valuesAtRound[_round].commitsString;
        _commitsString = bytes.concat(_commitsString, _c.val);
        userInfosAtRound[msg.sender][_round] = UserAtRound(_count, true, false);
        commitRevealValues[_round][_count] = CommitRevealValue(_c, BigNumbers.zero(), msg.sender); //index setUps from 0, so _count -1
        valuesAtRound[_round].commitsString = _commitsString;
        valuesAtRound[_round].count = ++_count;
        emit CommitC(msg.sender, _c, _commitsString, _count, block.timestamp);
    }

    /**
     * @param _a participant's reveal value
     * @notice Reveal function
     * @notice h must be set before reveal
     * @notice participant must have committed
     * @notice participant must not have revealed
     * @notice The participant's reveal value must match the commit value
     * @notice The participant's reveal value must be less than the modulor
     * @notice check period, update stage if needed, revert if not currently at reveal stage
     * @notice update omega, count
     * @notice if count == 0, update valuesAtRound, stage
     * @notice update userInfosAtRound
     */
    function reveal(uint256 _round, BigNumber calldata _a) external {
        UserAtRound memory _user = userInfosAtRound[msg.sender][_round];
        if (!_user.committed) revert NotCommittedParticipant();
        if (_user.revealed) revert AlreadyRevealed();
        if (
            !(setUpValuesAtRound[_round].g.modexp(_a, setUpValuesAtRound[_round].n)).eq(
                commitRevealValues[_round][_user.index].c
            )
        ) revert ModExpRevealNotMatchCommit();
        checkStage(_round);
        equalStage(_round, Stages.Reveal);
        //uint256 _count = --count;
        uint256 _count = valuesAtRound[_round].count -= ONE;
        commitRevealValues[_round][_user.index].a = _a;
        if (_count == ZERO) {
            valuesAtRound[_round].stage = Stages.Finished;
            valuesAtRound[_round].isAllRevealed = true;
        }
        userInfosAtRound[msg.sender][_round].revealed = true;
        emit RevealA(msg.sender, _a, _count, block.timestamp);
    }

    function calculateOmega(uint256 _round) external returns (BigNumber memory) {
        if (!valuesAtRound[_round].isAllRevealed) revert NotAllRevealed();
        if (valuesAtRound[_round].isCompleted) return valuesAtRound[_round].omega;
        checkStage(_round);
        equalStage(_round, Stages.Finished);
        uint256 _numOfParticipants = valuesAtRound[_round].numOfParticipants;
        BigNumber memory _omega = BigNumbers.one();
        bytes memory _bStar = valuesAtRound[_round].bStar;
        BigNumber memory _h = setUpValuesAtRound[_round].h;
        BigNumber memory _n = setUpValuesAtRound[_round].n;
        for (uint256 i; i < _numOfParticipants; i = unchecked_inc(i)) {
            BigNumber memory _temp = modHash(
                bytes.concat(commitRevealValues[_round][i].c.val, _bStar),
                _n
            );
            _omega = _omega.modmul(
                _h.modexp(_temp, _n).modexp(commitRevealValues[_round][i].a, _n),
                _n
            );
        }
        valuesAtRound[_round].omega = _omega;
        valuesAtRound[_round].isCompleted = true; //false when not all participants have revealed
        valuesAtRound[_round].stage = Stages.Finished;
        emit CalculatedOmega(_round, _omega, block.timestamp);
        return _omega;
    }

    /**
     * @param proofs the proof of the recovered value
     * @notice Recover function
     * @notice The recovered value must be less than the modulor
     * @notice revert if currently at commit stage
     * @notice revert if count == 0 meaning no one has committed
     * @notice calculate and finalize omega
     */
    function recover(uint256 _round, VDFClaim[] calldata proofs) external {
        BigNumber memory _n = setUpValuesAtRound[_round].n;
        uint256 _proofsSize = proofs.length;
        checkStage(_round);
        uint256 _numOfParticipants = valuesAtRound[_round].numOfParticipants;
        if (valuesAtRound[_round].stage == Stages.Commit) revert FunctionInvalidAtThisStage();
        if (_numOfParticipants == ZERO) revert NoneParticipated();
        bytes memory _bStar = valuesAtRound[_round].bStar;
        if (valuesAtRound[_round].isCompleted) revert OmegaAlreadyCompleted();
        if (
            setUpValuesAtRound[_round].T != proofs[ZERO].T ||
            setUpValuesAtRound[_round].proofSize != _proofsSize
        ) revert TNotMatched();
        if (!verifyRecursiveHalvingProof(proofs, _n, _proofsSize)) revert NotVerified();
        BigNumber memory _recov = BigNumbers.one();
        for (uint256 i; i < _numOfParticipants; i = unchecked_inc(i)) {
            BigNumber memory _c = commitRevealValues[_round][i].c;
            _recov = _recov.modmul(_c.modexp(modHash(bytes.concat(_c.val, _bStar), _n), _n), _n);
        }
        if (!_recov.eq(proofs[ZERO].x)) revert RecovNotMatchX();
        valuesAtRound[_round].isCompleted = true;
        valuesAtRound[_round].omega = proofs[ZERO].y;
        valuesAtRound[_round].stage = Stages.Finished;
        emit Recovered(msg.sender, _recov, proofs[ZERO].y, block.timestamp);
    }

    /**
     * @notice SetUp function
     * @notice The contract must be in the Finished stage
     * @notice The commit period must be less than the commit + reveal period
     * @notice The g value must be less than the modulor
     * @notice reset count, commitsString, isHAndBStarSet, stage, setUpTime, commitDuration, commitRevealDuration, n, g, omega
     * @notice increase round
     */
    function setUp(
        uint256 _commitDuration,
        uint256 _commitRevealDuration,
        BigNumber calldata _n,
        VDFClaim[] calldata _proofs
    ) external returns (uint256 _round) {
        _round = nextRound++;
        uint256 _proofsSize = _proofs.length;
        if (_commitDuration >= _commitRevealDuration)
            revert CommitRevealDurationLessThanCommitDuration();
        if (!verifyRecursiveHalvingProof(_proofs, _n, _proofsSize)) revert NotVerified();
        setUpValuesAtRound[_round].setUpTime = block.timestamp;
        setUpValuesAtRound[_round].commitDuration = _commitDuration;
        setUpValuesAtRound[_round].commitRevealDuration = _commitRevealDuration;
        setUpValuesAtRound[_round].T = _proofs[ZERO].T;
        setUpValuesAtRound[_round].g = _proofs[ZERO].x;
        setUpValuesAtRound[_round].h = _proofs[ZERO].y;
        setUpValuesAtRound[_round].n = _n;
        setUpValuesAtRound[_round].proofSize = _proofsSize;
        valuesAtRound[_round].stage = Stages.Commit;
        valuesAtRound[_round].count = ZERO;
        valuesAtRound[_round].commitsString = "";
        emit SetUp(
            msg.sender,
            block.timestamp,
            _commitDuration,
            _commitRevealDuration,
            _n,
            _proofs[ZERO].x,
            _proofs[ZERO].y,
            _proofs[ZERO].T,
            _round
        );
    }

    function getNextRound() external view returns (uint256) {
        return nextRound;
    }

    function getSetUpValuesAtRound(
        uint256 _round
    ) external view returns (SetUpValueAtRound memory) {
        return setUpValuesAtRound[_round];
    }

    function getValuesAtRound(uint256 _round) external view returns (ValueAtRound memory) {
        return valuesAtRound[_round];
    }

    function getCommitRevealValues(
        uint256 _round,
        uint256 _index
    ) external view returns (CommitRevealValue memory) {
        return commitRevealValues[_round][_index];
    }

    function getUserInfosAtRound(
        address _owner,
        uint256 _round
    ) external view returns (UserAtRound memory) {
        return userInfosAtRound[_owner][_round];
    }

    /**
     * @notice checkStage function
     * @notice revert if the current stage is not the given stage
     * @notice this function is used to check if the current stage is the given stage
     * @notice it will update the stage to the next stage if needed
     */
    function checkStage(uint256 _round) private {
        uint256 _setUpTime = setUpValuesAtRound[_round].setUpTime;
        if (
            valuesAtRound[_round].stage == Stages.Commit &&
            block.timestamp >= _setUpTime + setUpValuesAtRound[_round].commitDuration
        ) {
            if (valuesAtRound[_round].count != ZERO) {
                valuesAtRound[_round].stage = Stages.Reveal;
                valuesAtRound[_round].numOfParticipants = valuesAtRound[_round].count;
                valuesAtRound[_round].bStar = modHash(
                    valuesAtRound[_round].commitsString,
                    setUpValuesAtRound[_round].n
                ).val;
            } else {
                valuesAtRound[_round].stage = Stages.Finished;
            }
        }
        if (
            valuesAtRound[_round].stage == Stages.Reveal &&
            (block.timestamp >= _setUpTime + setUpValuesAtRound[_round].commitRevealDuration)
        ) {
            valuesAtRound[_round].stage = Stages.Finished;
        }
    }

    function equalStage(uint256 _round, Stages _stage) private view {
        if (valuesAtRound[_round].stage != _stage) revert FunctionInvalidAtThisStage();
    }

    function modHash(
        bytes memory _strings,
        BigNumber memory _n
    ) private view returns (BigNumber memory) {
        return abi.encodePacked(keccak256(_strings)).init().mod(_n);
    }

    function verifyRecursiveHalvingProof(
        VDFClaim[] calldata _proofList,
        BigNumber memory _n,
        uint256 _proofSize
    ) private view returns (bool) {
        BigNumber memory _two = BigNumbers.two();
        for (uint256 i; i < _proofSize; i = unchecked_inc(i)) {
            if (_proofList[i].T == ONE) {
                return _proofList[i].y.eq(_proofList[i].x.modexp(_two, _n));
            }
            BigNumber memory _y = _proofList[i].y;
            BigNumber memory _r = modHash(
                bytes.concat(_proofList[i].y.val, _proofList[i].v.val),
                _proofList[i].x
            ).mod(BigNumber(MODFORHASH, MODFORHASH_LEN));
            if (_proofList[i].T & ONE == ONE) _y = _y.modexp(_two, _n);
            BigNumber memory _xPrime = _proofList[i].x.modexp(_r, _n).modmul(_proofList[i].v, _n);
            if (!_xPrime.eq(_proofList[unchecked_inc(i)].x)) return false;
            BigNumber memory _yPrime = _proofList[i].v.modexp(_r, _n);
            if (!_yPrime.modmul(_y, _n).eq(_proofList[unchecked_inc(i)].y)) return false;
        }
        return true;
    }

    function unchecked_inc(uint256 i) private pure returns (uint) {
        unchecked {
            return i + ONE;
        }
    }
}
