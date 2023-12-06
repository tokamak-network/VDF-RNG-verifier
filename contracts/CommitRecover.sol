// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;
import "./libraries/Pietrzak_VDF.sol";

/**
 * @title Bicorn-RX Commit-Reveal-Recover
 * @author Justin g
 * @notice This contract is for generating random number
 *    1. Commit: participants commit their value
 *    2. Reveal: participants reveal their value
 *    3. Finished: Calculate or recover the random number
 *    4. go to 1
 */
contract CommitRecover {
    /* Type declaration */
    /**
     * @notice Stages of the contract
     * @notice Recover can be performed in the Reveal and Finished stages.
     */
    using BigNumbers for BigNumber;
    using Pietrzak_VDF for *;
    enum Stages {
        Finished,
        Commit,
        Reveal
    }
    struct StartValueAtRound {
        uint256 startTime;
        uint256 commitDuration;
        uint256 commitRevealDuration; //commit + reveal period, commitRevealDuration - commitDuration => revealDuration
        BigNumber n; // modulor
        BigNumber g; // a value generated from the generator list
        BigNumber h; // a value generated from the VDF(g)
        uint256 T;
    }
    struct ValueAtRound {
        BigNumber omega; // the random number
        bytes bStar; //hash of commitsString
        uint256 numOfParticipants; // number of participants
        uint256 count; //This variable is used to keep track of the number of commitments and reveals, and to check if anything has been committed when moving to the reveal stage.
        bytes commitsString; //concatenated string of commits
        Stages stage;
        bool isCompleted; // omega is finalized when this is true
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
    //bool public isHAndBStarSet;
    uint256 public mostRecentRound;
    mapping(uint256 round => mapping(uint256 index => CommitRevealValue)) public commitRevealValues; //
    mapping(uint256 round => StartValueAtRound) public startValuesAtRound;
    mapping(uint256 round => ValueAtRound omega) public valuesAtRound; // 1 => ValueAtRound(omega, isCompleted, ...), 2 => ValueAtRound(omega, isCompleted, ...), ...
    mapping(address owner => mapping(uint256 round => UserAtRound user)) public userInfosAtRound;

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
    event Start(
        address msgSender,
        uint256 startTime,
        uint256 commitDuration,
        uint256 commitRevealDuration,
        BigNumber n,
        BigNumber g,
        BigNumber h,
        uint256 T,
        uint256 round
    );
    event CalculatedOmega(uint256 round, BigNumber omega, uint256 calculatedTimestamp);

    /* Functions */
    /**
     * @param _commit participant's commit value
     * @notice Commit function
     * @notice The participant's commit value must be less than the modulor
     * @notice The participant can only commit once
     * @notice check period, update stage if needed, revert if not currently at commit stage
     */
    function commit(uint256 _round, BigNumber memory _commit) public {
        require(!userInfosAtRound[msg.sender][_round].committed, "AlreadyCommitted");
        checkStage(_round);
        equalStage(_round, Stages.Commit);
        uint256 _count = valuesAtRound[_round].count;
        bytes memory _commitsString = valuesAtRound[_round].commitsString;
        _commitsString = bytes.concat(_commitsString, _commit.val);
        userInfosAtRound[msg.sender][_round] = UserAtRound(_count, true, false);
        commitRevealValues[_round][_count] = CommitRevealValue(
            _commit,
            BigNumbers.one(),
            msg.sender
        ); //index starts from 0, so _count -1
        valuesAtRound[_round].commitsString = _commitsString;
        valuesAtRound[_round].count = ++_count;
        emit CommitC(msg.sender, _commit, _commitsString, _count, block.timestamp);
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
    function reveal(uint256 _round, BigNumber calldata _a) public {
        UserAtRound memory _user = userInfosAtRound[msg.sender][_round];
        require(_user.committed, "NotCommittedParticipant");
        require(!_user.revealed, "AlreadyRevealed");
        require(
            (startValuesAtRound[_round].g.modexp(_a, startValuesAtRound[_round].n)).eq(
                commitRevealValues[_round][_user.index].c
            ),
            "ANotMatchCommit"
        );
        checkStage(_round);
        equalStage(_round, Stages.Reveal);
        //uint256 _count = --count;
        uint256 _count = valuesAtRound[_round].count -= 1;
        commitRevealValues[_round][_user.index].a = _a;
        if (_count == 0) {
            valuesAtRound[_round].stage = Stages.Finished;
            valuesAtRound[_round].isAllRevealed = true;
        }
        userInfosAtRound[msg.sender][_round].revealed = true;
        emit RevealA(msg.sender, _a, _count, block.timestamp);
    }

    function calculateOmega(uint256 _round) public returns (BigNumber memory) {
        require(valuesAtRound[_round].isAllRevealed, "NotAllRevealed");
        require(!valuesAtRound[_round].isCompleted, "OmegaAlreadyCompleted");
        checkStage(_round);
        equalStage(_round, Stages.Finished);
        uint256 _numOfParticipants = valuesAtRound[_round].numOfParticipants;
        BigNumber memory _omega = BigNumbers.one();
        bytes memory _bStar = valuesAtRound[_round].bStar;
        BigNumber memory _h = startValuesAtRound[_round].h;
        BigNumber memory _n = startValuesAtRound[_round].n;
        for (uint256 i = 0; i < _numOfParticipants; i++) {
            _omega = _omega.modmul(
                _h
                    .modexp(
                        // Pietrzak_VDF.modHash(_n, bytes.concat(commitRevealValues[_round][i].c, _bStar)),
                        _n.modHash(bytes.concat(commitRevealValues[_round][i].c.val, _bStar)),
                        _n
                    )
                    .modexp(commitRevealValues[_round][i].a, _n),
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
    function recover(uint256 _round, Pietrzak_VDF.VDFClaim[] calldata proofs) public {
        BigNumber memory recov = BigNumbers.one();
        BigNumber memory _n = startValuesAtRound[_round].n;
        checkStage(_round);
        require(valuesAtRound[_round].stage > Stages.Commit, "FunctionInvalidAtThisStage");
        bytes memory _bStar = valuesAtRound[_round].bStar;
        require(!valuesAtRound[_round].isCompleted, "OmegaAlreadyCompleted");
        require(startValuesAtRound[_round].T == proofs[0].T, "TNotMatched");
        require(Pietrzak_VDF.verifyRecursiveHalvingProof(proofs), "not verified");
        for (uint256 i = 0; i < valuesAtRound[_round].numOfParticipants; i++) {
            BigNumber memory _c = commitRevealValues[_round][i].c;
            BigNumber memory temp = _c.modexp(_n.modHash(bytes.concat(_c.val, _bStar)), _n);
            //recov = mulmod(recov, temp, _n);
            recov = recov.modmul(temp, _n);
        }
        //require(recov == proofs[0].x, "RecovNotMatchX");
        require(recov.eq(proofs[0].x), "RecovNotMatchX");
        valuesAtRound[_round].isCompleted = true;
        valuesAtRound[_round].omega = proofs[0].y;
        valuesAtRound[_round].stage = Stages.Finished;
        emit Recovered(msg.sender, recov, proofs[0].y, block.timestamp);
    }

    /**
     * @notice Start function
     * @notice The contract must be in the Finished stage
     * @notice The commit period must be less than the commit + reveal period
     * @notice The g value must be less than the modulor
     * @notice reset count, commitsString, isHAndBStarSet, stage, startTime, commitDuration, commitRevealDuration, n, g, omega
     * @notice increase round
     */
    function start(
        uint256 _commitDuration,
        uint256 _commitRevealDuration,
        BigNumber calldata _n,
        Pietrzak_VDF.VDFClaim[] calldata _proofs
    ) public returns (uint256 _round) {
        _round = ++mostRecentRound;
        require(valuesAtRound[_round].stage == Stages.Finished, "StageNotFinished");
        require(
            _commitDuration < _commitRevealDuration,
            "CommitRevealDurationLessThanCommitDuration"
        );
        require(Pietrzak_VDF.verifyRecursiveHalvingProof(_proofs), "not verified");
        valuesAtRound[_round].stage = Stages.Commit;
        startValuesAtRound[_round].startTime = block.timestamp;
        startValuesAtRound[_round].commitDuration = _commitDuration;
        startValuesAtRound[_round].commitRevealDuration = _commitRevealDuration;
        startValuesAtRound[_round].T = _proofs[0].T;
        startValuesAtRound[_round].g = _proofs[0].x;
        startValuesAtRound[_round].h = _proofs[0].y;
        startValuesAtRound[_round].n = _n;
        valuesAtRound[_round].count = 0;
        valuesAtRound[_round].commitsString = "";
        emit Start(
            msg.sender,
            block.timestamp,
            _commitDuration,
            _commitRevealDuration,
            _n,
            _proofs[0].x,
            _proofs[0].y,
            _proofs[0].T,
            _round
        );
    }

    /**
     * @notice checkStage function
     * @notice revert if the current stage is not the given stage
     * @notice this function is used to check if the current stage is the given stage
     * @notice it will update the stage to the next stage if needed
     */
    function checkStage(uint256 _round) public {
        //uint256 _startTime = startTime;
        uint256 _startTime = startValuesAtRound[_round].startTime;
        if (
            valuesAtRound[_round].stage == Stages.Commit &&
            block.timestamp >= _startTime + startValuesAtRound[_round].commitDuration
        ) {
            if (valuesAtRound[_round].count != 0) {
                nextStage(_round);
                valuesAtRound[_round].numOfParticipants = valuesAtRound[_round].count;
                // uint256 _bStar = uint256(keccak256(abi.encodePacked(commitsString))) %
                //     valuesAtRound[round].n;
                bytes memory _bStar = startValuesAtRound[_round]
                    .n
                    .modHash(valuesAtRound[_round].commitsString)
                    .val;
                valuesAtRound[_round].bStar = _bStar;
            } else {
                valuesAtRound[_round].stage = Stages.Finished;
            }
        }
        if (
            valuesAtRound[_round].stage == Stages.Reveal &&
            (block.timestamp >= _startTime + startValuesAtRound[_round].commitRevealDuration ||
                valuesAtRound[_round].count == 0)
        ) {
            nextStage(_round);
        }
    }

    function equalStage(uint256 _round, Stages _stage) internal view {
        require(valuesAtRound[_round].stage == _stage, "FunctionInvalidAtThisStage");
    }

    /**
     * @notice NextStage function
     * @notice update stage to the next stage
     * @notice revert if the current stage is Finished
     */
    function nextStage(uint256 _round) internal {
        Stages _stage = valuesAtRound[_round].stage;
        require(_stage != Stages.Finished, "AllFinished");
        valuesAtRound[_round].stage = Stages(addmod(uint256(_stage), 1, 3));
    }
}
