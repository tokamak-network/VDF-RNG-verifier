// Copyright 2024 justin
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import { time } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from "chai"
import { AddressLike, BigNumberish, BytesLike } from "ethers"
import { ethers, network } from "hardhat"
import { developmentChains } from "../../helper-hardhat-config"
import { CRRNGCoordinatorPoF, ConsumerExample } from "../../typechain-types"
import OVM_GasPriceOracleABI from "../shared/Abis/OVM_GasPriceOracle.json"
import {
    returnCoordinatorConstructorParams,
    returnIntializeAndCommitAndRecoverParams,
} from "../shared/setCRRNGCoordinatorPoF"
interface BigNumber {
    val: BytesLike
    bitlen: BigNumberish
}
const getBitLenth2 = (num: string): BigNumberish => {
    return BigInt(num).toString(2).length
}
interface ValueAtRound {
    commitEndTime: BigNumberish
    consumer: AddressLike
    omega: BigNumber
    isRecovered: boolean
    isVerified: boolean
}
function getLength(value: number): number {
    let length: number = 32
    while (length < value) length += 32
    return length
}

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("ProofOfFraud Test PoF", function () {
          const L1_FEE_DATA_PADDING =
              "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          let callback_gaslimit: BigNumberish
          let coordinatorConstructorParams: {
              disputePeriod: BigNumberish
              minimumDepositAmount: BigNumberish
              avgL2GasUsed: BigNumberish
              avgL1GasUsed: BigNumberish
              premiumPercentage: BigNumberish
              penaltyPercentage: BigNumberish
              flatFee: BigNumberish
          }
          let signers: SignerWithAddress[]
          let crrrngCoordinator: CRRNGCoordinatorPoF
          let crrngCoordinatorAddress: string
          let consumerExample: ConsumerExample
          let initializeParams: {
              v: BigNumber[]
              x: BigNumber
              y: BigNumber
          }
          let commitParams: BigNumber[]
          let recoverParams: {
              round: number
              v: BigNumber[]
              x: BigNumber
              y: BigNumber
          }
          let smallestHashSigner: SignerWithAddress
          let secondSmallestHashSigner: SignerWithAddress
          let thirdSmallestHashSigner: SignerWithAddress
          describe("Settings", function () {
              it("get signers", async () => {
                  signers = await ethers.getSigners()
                  await expect(signers.length).to.eq(500)
              })
              it("Create TestCase And PreProcess Data", async () => {
                  ;({ initializeParams, commitParams, recoverParams } =
                      returnIntializeAndCommitAndRecoverParams())
                  coordinatorConstructorParams = returnCoordinatorConstructorParams()
              })
              it("test callbackGasLimit for example contract", async function () {
                  const ConsumerExample = await ethers.getContractFactory("ConsumerExampleTest")
                  const consumerExample = await ConsumerExample.deploy(signers[0])
                  const tx = await consumerExample.rawFulfillRandomWords(
                      0,
                      ethers.keccak256("0x01"),
                  )
                  const receipt = await tx.wait()
                  const gasUsed = receipt?.gasUsed as bigint
                  console.log(
                      "set callback_gaslimit gasUsed * 1.25",
                      (gasUsed * (100n + 25n)) / 100n,
                  )
                  callback_gaslimit = (gasUsed * (100n + 25n)) / 100n
              })
              it("deploy CRRRRNGCoordinator", async function () {
                  const CRRNGCoordinatorPoF = await ethers.getContractFactory("CRRNGCoordinatorPoF")
                  crrrngCoordinator = await CRRNGCoordinatorPoF.deploy(
                      coordinatorConstructorParams.disputePeriod,
                      coordinatorConstructorParams.minimumDepositAmount,
                      coordinatorConstructorParams.avgL2GasUsed,
                      coordinatorConstructorParams.avgL1GasUsed,
                      coordinatorConstructorParams.premiumPercentage,
                      coordinatorConstructorParams.penaltyPercentage,
                      coordinatorConstructorParams.flatFee,
                  )
                  await crrrngCoordinator.waitForDeployment()
                  const receipt = await crrrngCoordinator.deploymentTransaction()?.wait()
                  crrngCoordinatorAddress = await crrrngCoordinator.getAddress()
                  await expect(crrngCoordinatorAddress).to.be.properAddress

                  // ** get
                  const feeSettings = await crrrngCoordinator.getFeeSettings()
                  const disputePeriod = await crrrngCoordinator.getDisputePeriod()

                  // ** assert
                  await expect(feeSettings[0]).to.equal(
                      coordinatorConstructorParams.minimumDepositAmount,
                  )
                  await expect(feeSettings[1]).to.equal(coordinatorConstructorParams.avgL2GasUsed)
                  await expect(feeSettings[2]).to.equal(coordinatorConstructorParams.avgL1GasUsed)
                  await expect(feeSettings[3]).to.equal(
                      coordinatorConstructorParams.premiumPercentage,
                  )
                  await expect(feeSettings[4]).to.equal(coordinatorConstructorParams.flatFee)
                  await expect(disputePeriod).to.equal(coordinatorConstructorParams.disputePeriod)
              })
              it("initialize CRRNGCoordinatorPoF", async () => {
                  const tx = await crrrngCoordinator.initialize(
                      initializeParams.v,
                      initializeParams.x,
                      initializeParams.y,
                  )
                  const receipt = await tx.wait()

                  // ** get
                  const isInitialized = await crrrngCoordinator.isInitialized()

                  // ** assert
                  await expect(isInitialized).to.equal(true)
              })
              it("deploy ConsumerExample", async () => {
                  const ConsumerExample = await ethers.getContractFactory("ConsumerExample")
                  consumerExample = await ConsumerExample.deploy(crrngCoordinatorAddress)
                  await consumerExample.waitForDeployment()
                  const receipt = await consumerExample.deploymentTransaction()?.wait()
                  const consumerExampleAddress = await consumerExample.getAddress()
                  await expect(consumerExampleAddress).to.be.properAddress
              })
              it("5 operators deposit to become operator", async () => {
                  const minimumDepositAmount = coordinatorConstructorParams.minimumDepositAmount
                  const minimumDepositAmountFromContract =
                      await crrrngCoordinator.getMinimumDepositAmount()
                  await expect(minimumDepositAmount).to.equal(minimumDepositAmountFromContract)
                  for (let i: number = 0; i < 5; i++) {
                      const depositedAmount = await crrrngCoordinator.getDepositAmount(
                          signers[i].address,
                      )
                      if (depositedAmount < BigInt(minimumDepositAmount)) {
                          const tx = await crrrngCoordinator.connect(signers[i]).operatorDeposit({
                              value: BigInt(minimumDepositAmount) - depositedAmount,
                          })
                          const receipt = await tx.wait()
                      }
                      const depositedAmountAfter = await crrrngCoordinator.getDepositAmount(
                          signers[i].address,
                      )
                      const isOperator = await crrrngCoordinator.isOperator(signers[i].address)
                      await expect(depositedAmountAfter).to.equal(minimumDepositAmount)
                      await expect(isOperator).to.equal(true)
                  }
                  // ** get
                  const operatorCount = await crrrngCoordinator.getOperatorCount()

                  // ** assert
                  await expect(operatorCount).to.equal(5)
              })
          })
          describe("test RequestRandomWords", function () {
              it("try other external functions, and see if revert", async () => {
                  const round = await crrrngCoordinator.getNextRound()
                  await expect(
                      crrrngCoordinator.recover(round, recoverParams.y),
                  ).to.be.revertedWithCustomError(crrrngCoordinator, "NotStartedRound")
                  await expect(
                      crrrngCoordinator.connect(signers[0]).commit(round, commitParams[0]),
                  ).to.be.revertedWithCustomError(crrrngCoordinator, "NotStartedRound")
                  await expect(
                      crrrngCoordinator.disputeRecover(
                          round,
                          recoverParams.v,
                          recoverParams.x,
                          recoverParams.y,
                      ),
                  ).to.be.revertedWithCustomError(crrrngCoordinator, "OmegaNotCompleted")
                  await expect(
                      crrrngCoordinator.fulfillRandomness(round),
                  ).to.be.revertedWithCustomError(crrrngCoordinator, "NotCommittedParticipant")
              })
              it("Request Randomword on ConsumerExample", async () => {
                  const provider = ethers.provider
                  const fee = await provider.getFeeData()
                  const gasPrice = fee.gasPrice as bigint
                  const directFundingCost = await crrrngCoordinator.estimateDirectFundingPrice(
                      callback_gaslimit,
                      gasPrice,
                  )
                  const tx = await consumerExample.requestRandomWord({
                      value: (directFundingCost * (100n + 1n)) / 100n,
                  })
                  console.log("directFundingCost", directFundingCost)
                  const receipt = await tx.wait()
                  const requestCount = await consumerExample.requestCount()
                  const lastReqeustId = await consumerExample.lastRequestId()
                  const lastRequestIdfromArray = await consumerExample.requestIds(requestCount - 1n)
                  await expect(lastReqeustId).to.equal(lastRequestIdfromArray)
                  const requestStatus = await consumerExample.getRequestStatus(lastReqeustId)
                  await expect(requestStatus[0]).to.equal(true)
                  await expect(requestStatus[1]).to.equal(false)
                  await expect(requestStatus[2]).to.equal(0n)

                  // ** CRRNGCoordinatorPoF get
                  // 1. s_valuesAtRound[_round].stage is Stages.Commit
                  // 2. s_valuesAtRound[_round].consumer is consumerExample.address
                  // s_cost[_round]

                  const round = (await crrrngCoordinator.getNextRound()) - 1n
                  const valuesAtRound = await crrrngCoordinator.getValuesAtRound(round)
                  const consumerAddress = await crrrngCoordinator.getConsumerAtRound(round)

                  // ** assert
                  await expect(valuesAtRound.commitEndTime).to.be.equal(0n)
                  await expect(valuesAtRound.consumer).to.be.equal(
                      await consumerExample.getAddress(),
                  )
                  await expect(consumerAddress).to.be.equal(await consumerExample.getAddress())
                  await expect(valuesAtRound.omega.val).to.be.equal("0x")
                  await expect(valuesAtRound.isRecovered).to.be.equal(false)
                  await expect(valuesAtRound.isVerified).to.be.equal(false)
              })
              it("1 operator commit once and reRequestRandomWord", async () => {
                  const round = (await crrrngCoordinator.getNextRound()) - 1n
                  const numOfOperators = 1
                  for (let i = 0; i < numOfOperators; i++) {
                      let rand = crypto.getRandomValues(new Uint8Array(2048 / 8))
                      const bytesHex =
                          "0x" + rand.reduce((o, v) => o + ("00" + v.toString(16)).slice(-2), "")
                      const commit = {
                          val: ethers.toBeHex(
                              bytesHex,
                              getLength(ethers.dataLength(ethers.toBeHex(bytesHex))),
                          ),
                          bitlen: getBitLenth2(ethers.toBeHex(bytesHex)),
                      }

                      const tx = await crrrngCoordinator.connect(signers[i]).commit(round, commit)
                      const receipt = await tx.wait()
                      const valuesAtRound: ValueAtRound =
                          await crrrngCoordinator.getValuesAtRound(round)
                      const commitCount = await crrrngCoordinator.getCommitCountAtRound(round)
                      const validCommitCount =
                          await crrrngCoordinator.getValidCommitCountAtRound(round)
                      await expect(commitCount).to.equal(validCommitCount)
                      await expect(commitCount).to.equal(i + 1)

                      const userStatusAtRound = await crrrngCoordinator.getUserStatusAtRound(
                          signers[i].address,
                          round,
                      )
                      await expect(userStatusAtRound.committed).to.equal(true)
                      await expect(userStatusAtRound.commitIndex).to.equal(i)
                      const getCommitValues = await crrrngCoordinator.getOneCommitValueAtRound(
                          round,
                          userStatusAtRound.commitIndex,
                      )
                      const operatorAddress =
                          await crrrngCoordinator.getOneCommittedOperatorAtRound(
                              round,
                              userStatusAtRound.commitIndex,
                          )
                      const operatorAddresses =
                          await crrrngCoordinator.getCommittedOperatorsAtRound(round)
                      await expect(operatorAddress).to.equal(
                          operatorAddresses[Number(userStatusAtRound.commitIndex)],
                      )
                      await expect(operatorAddress).to.equal(signers[i].address)

                      if (i == 0) {
                          const blockNumber = receipt?.blockNumber as number
                          const provider = ethers.provider
                          const blockTimestamp = (await provider.getBlock(blockNumber))?.timestamp
                          const valuesAtRound = await crrrngCoordinator.getValuesAtRound(round)
                          await expect(
                              await crrrngCoordinator.getValidCommitCountAtRound(i),
                          ).to.equal(1)
                          await expect(valuesAtRound.commitEndTime).to.equal(blockTimestamp! + 60)
                      }
                  }
                  const committedOperators =
                      await crrrngCoordinator.getCommittedOperatorsAtRound(round)
                  await expect(committedOperators.length).to.equal(1)
                  await expect(committedOperators[0]).to.equal(signers[0].address)
                  await time.increase(120n)

                  // ** reRequestRandomWordAtRound
                  const tx = await crrrngCoordinator.reRequestRandomWordAtRound(round)
                  const receipt = await tx.wait()
                  const gasUsed = receipt?.gasUsed as bigint
                  const commitCount = await crrrngCoordinator.getCommitCountAtRound(round)
                  const validCommitCount = await crrrngCoordinator.getValidCommitCountAtRound(round)
                  expect(commitCount).to.equal(validCommitCount + 1n)
              })
              it("3 operators commit to CRRNGCoordinatorPoF", async () => {
                  const round = (await crrrngCoordinator.getNextRound()) - 1n
                  const numOfOperators = 3
                  for (let i = 0; i < numOfOperators; i++) {
                      const tx = await crrrngCoordinator
                          .connect(signers[i])
                          .commit(round, commitParams[i])
                      const receipt = await tx.wait()
                      const valuesAtRound: ValueAtRound =
                          await crrrngCoordinator.getValuesAtRound(round)
                      const commitCount = await crrrngCoordinator.getCommitCountAtRound(round)
                      const validCommitCount =
                          await crrrngCoordinator.getValidCommitCountAtRound(round)
                      await expect(commitCount).to.equal(validCommitCount)
                      await expect(commitCount).to.equal(i + 1)
                      const gasUsed = receipt?.gasUsed as bigint

                      const userStatusAtRound = await crrrngCoordinator.getUserStatusAtRound(
                          signers[i].address,
                          round,
                      )
                      await expect(userStatusAtRound.committed).to.equal(true)
                      await expect(userStatusAtRound.commitIndex).to.equal(i)
                      const getOneCommitValue = await crrrngCoordinator.getOneCommitValueAtRound(
                          round,
                          userStatusAtRound.commitIndex,
                      )
                      const getCommitValues = await crrrngCoordinator.getCommitValuesAtRound(i)
                      const operatorAddress =
                          await crrrngCoordinator.getOneCommittedOperatorAtRound(
                              round,
                              userStatusAtRound.commitIndex,
                          )
                      const operatorAddresses =
                          await crrrngCoordinator.getCommittedOperatorsAtRound(round)
                      await expect(operatorAddress).to.equal(
                          operatorAddresses[Number(userStatusAtRound.commitIndex)],
                      )
                      await expect(operatorAddress).to.equal(operatorAddresses[i])
                      await expect(getOneCommitValue.val).to.equal(commitParams[i].val)
                      await expect(operatorAddress).to.equal(signers[i].address)

                      if (i == 0) {
                          const blockNumber = receipt?.blockNumber as number
                          const provider = ethers.provider
                          const blockTimestamp = (await provider.getBlock(blockNumber))?.timestamp
                          const valuesAtRound = await crrrngCoordinator.getValuesAtRound(round)
                          await expect(valuesAtRound.commitEndTime).to.equal(blockTimestamp! + 60)
                          await expect(
                              await crrrngCoordinator.getValidCommitCountAtRound(round),
                          ).to.equal(1)
                      }
                  }
                  const committedOperators =
                      await crrrngCoordinator.getCommittedOperatorsAtRound(round)
                  await expect(committedOperators.length).to.equal(3)
              })
              it("try all other external functions that are not supposed to be in Commit phase, and see if revert", async () => {
                  const round = (await crrrngCoordinator.getNextRound()) - 1n
                  await expect(
                      crrrngCoordinator.recover(round, recoverParams.y),
                  ).to.be.revertedWithCustomError(crrrngCoordinator, "StillInCommitPhase")
                  await expect(
                      crrrngCoordinator.disputeRecover(
                          round,
                          recoverParams.v,
                          recoverParams.x,
                          recoverParams.y,
                      ),
                  ).to.be.revertedWithCustomError(crrrngCoordinator, "OmegaNotCompleted")
                  await expect(
                      crrrngCoordinator.fulfillRandomness(round),
                  ).to.be.revertedWithCustomError(crrrngCoordinator, "OmegaNotCompleted")
              })
              it("calculate hash(R|address) for each operator", async () => {
                  const Rval = recoverParams.y.val
                  const hashResults: any = []
                  for (let i = 0; i < 3; i++) {
                      const hash = ethers.solidityPackedKeccak256(
                          ["bytes", "address"],
                          [Rval, signers[i].address],
                      )
                      hashResults.push([hash, signers[i].address, i])
                  }
                  hashResults.sort()
                  const provider = ethers.provider
                  thirdSmallestHashSigner = await provider.getSigner(hashResults[2][1])
                  secondSmallestHashSigner = await provider.getSigner(hashResults[1][1])
                  smallestHashSigner = await provider.getSigner(hashResults[0][1])
              })
              it("thirdSmallestHashSigner recover", async () => {
                  await time.increase(1200n)
                  const round = (await crrrngCoordinator.getNextRound()) - 1n
                  const tx = await crrrngCoordinator
                      .connect(thirdSmallestHashSigner)
                      .recover(round, recoverParams.x)
                  const receipt = await tx.wait()
                  const gasUsed = receipt?.gasUsed as bigint

                  const provider = ethers.provider
                  const blockNumber = receipt?.blockNumber as number
                  const blockTimestamp = BigInt(
                      (await provider.getBlock(blockNumber))?.timestamp as number,
                  )

                  // ** get
                  const valuesAtRound = await crrrngCoordinator.getValuesAtRound(round)
                  const getDisputeEndTimeAndLeaderAtRound =
                      await crrrngCoordinator.getDisputeEndTimeAndLeaderAtRound(round)
                  const getDisputeEndTimeOfOperator =
                      await crrrngCoordinator.getDisputeEndTimeOfOperator(
                          thirdSmallestHashSigner.address,
                      )
                  const getValidCommitCount =
                      await crrrngCoordinator.getValidCommitCountAtRound(round)

                  // ** assert
                  await expect(getValidCommitCount).to.equal(3)
                  await expect(valuesAtRound.isRecovered).to.equal(true)
                  await expect(valuesAtRound.omega.val).to.equal(recoverParams.x.val)
                  await expect(valuesAtRound.omega.bitlen).to.equal(recoverParams.x.bitlen)
                  await expect(valuesAtRound.isVerified).to.equal(false)

                  await expect(getDisputeEndTimeAndLeaderAtRound[0]).to.equal(
                      blockTimestamp + BigInt(coordinatorConstructorParams.disputePeriod),
                  )
                  await expect(getDisputeEndTimeAndLeaderAtRound[1]).to.equal(
                      thirdSmallestHashSigner.address,
                  )

                  await expect(getDisputeEndTimeOfOperator).to.equal(
                      blockTimestamp + BigInt(coordinatorConstructorParams.disputePeriod),
                  )
                  await expect(
                      await crrrngCoordinator.getDepositAmount(thirdSmallestHashSigner.address),
                  ).to.equal(coordinatorConstructorParams.minimumDepositAmount)
              })
              it("try all other external functions that are not supposed to be executed after Recover phase, and see if revert", async () => {
                  const round = (await crrrngCoordinator.getNextRound()) - 1n
                  await expect(
                      crrrngCoordinator.commit(round, commitParams[0]),
                  ).to.be.revertedWithCustomError(crrrngCoordinator, "CommitPhaseEnded")
                  await expect(
                      crrrngCoordinator.recover(round, recoverParams.y),
                  ).to.be.revertedWithCustomError(crrrngCoordinator, "OmegaAlreadyCompleted")
                  await expect(
                      crrrngCoordinator.fulfillRandomness(round),
                  ).to.be.revertedWithCustomError(
                      crrrngCoordinator,
                      "DisputePeriodNotEndedOrStarted",
                  )
              })
              it("disputeRecover by secondSmallestHashSigner", async () => {
                  const round = (await crrrngCoordinator.getNextRound()) - 1n
                  const tx = await crrrngCoordinator
                      .connect(secondSmallestHashSigner)
                      .disputeRecover(round, recoverParams.v, recoverParams.x, recoverParams.y)
                  const receipt = await tx.wait()
                  const gasUsed = receipt?.gasUsed as bigint
                  console.log("disputeRecover", gasUsed)

                  const encodedFuncData = crrrngCoordinator.interface.encodeFunctionData(
                      "disputeRecover",
                      [round, recoverParams.v, recoverParams.x, recoverParams.y],
                  )
                  const concatedNatedData = ethers.concat([encodedFuncData, L1_FEE_DATA_PADDING])
                  const titanProvider = new ethers.JsonRpcProvider(
                      "https://rpc.titan.tokamak.network",
                  )
                  const signer = new ethers.JsonRpcSigner(titanProvider, signers[0].address)
                  const OVM_GasPriceOracle = await ethers.getContractAt(
                      OVM_GasPriceOracleABI,
                      "0x420000000000000000000000000000000000000F",
                      signer,
                  )
                  const l1GasUsed =
                      (await OVM_GasPriceOracle.getL1GasUsed(concatedNatedData)) - 4000n
                  console.log("disputeRecover l1GasUsed: ", l1GasUsed)

                  // ** get
                  const valuesAtRound = await crrrngCoordinator.getValuesAtRound(round)
                  const getDisputeEndTimeAndLeaderAtRound =
                      await crrrngCoordinator.getDisputeEndTimeAndLeaderAtRound(round)
                  const getDisputeEndTimeOfOperatorThird =
                      await crrrngCoordinator.getDisputeEndTimeOfOperator(
                          thirdSmallestHashSigner.address,
                      )
                  const getDisputeEndTimeOfOperatorSecond =
                      await crrrngCoordinator.getDisputeEndTimeOfOperator(
                          secondSmallestHashSigner.address,
                      )
                  const getValidCommitCount =
                      await crrrngCoordinator.getValidCommitCountAtRound(round)

                  // ** assert
                  await expect(getValidCommitCount).to.equal(3)
                  await expect(valuesAtRound.isRecovered).to.equal(true)
                  await expect(valuesAtRound.omega.val).to.equal(recoverParams.y.val)
                  await expect(valuesAtRound.omega.bitlen).to.equal(recoverParams.y.bitlen)
                  await expect(valuesAtRound.isVerified).to.equal(true)

                  await expect(getDisputeEndTimeAndLeaderAtRound[1]).to.equal(
                      secondSmallestHashSigner.address,
                  )
                  await expect(getDisputeEndTimeOfOperatorThird).to.equal(
                      getDisputeEndTimeAndLeaderAtRound[0],
                  )
                  await expect(getDisputeEndTimeOfOperatorSecond).to.equal(
                      getDisputeEndTimeAndLeaderAtRound[0],
                  )

                  const operatorCount = await crrrngCoordinator.getOperatorCount()
                  const isOperatorSecond = await crrrngCoordinator.isOperator(
                      secondSmallestHashSigner.address,
                  )
                  const isOperatorThird = await crrrngCoordinator.isOperator(
                      thirdSmallestHashSigner.address,
                  )

                  // ** assert
                  await expect(operatorCount).to.equal(4)
                  await expect(isOperatorSecond).to.equal(true)
                  await expect(isOperatorThird).to.equal(false)
              })
              it("fulfillRandomness by smallestHashSigner", async () => {
                  const round = (await crrrngCoordinator.getNextRound()) - 1n
                  const disputePeriod = coordinatorConstructorParams.disputePeriod
                  await time.increase(BigInt(disputePeriod) + 1n)
                  const tx = await crrrngCoordinator
                      .connect(smallestHashSigner)
                      .fulfillRandomness(round)
                  const receipt = await tx.wait()
                  const gasUsed = receipt?.gasUsed as bigint

                  // ** get
                  const getFulfillStatusAtRound =
                      await crrrngCoordinator.getFulfillStatusAtRound(round)
                  const depositAmountThird = await crrrngCoordinator.getDepositAmount(
                      thirdSmallestHashSigner.address,
                  )
                  const depositAmountSecond = await crrrngCoordinator.getDepositAmount(
                      secondSmallestHashSigner.address,
                  )
                  const depositAmount = await crrrngCoordinator.getDepositAmount(
                      smallestHashSigner.address,
                  )
                  const getCostAtRound = await crrrngCoordinator.getCostAtRound(round)

                  // ** assert
                  await expect(getFulfillStatusAtRound[0]).to.equal(true)
                  await expect(getFulfillStatusAtRound[1]).to.equal(true)
              })
          })
          describe("disputeLeadershipAfterFulfill test", function () {
              it("run a round and fulfillRandomness by not leader", async () => {
                  // ** make five operators again
                  const minimumDepositAmount = coordinatorConstructorParams.minimumDepositAmount
                  for (let i: number = 0; i < 5; i++) {
                      const depositedAmount = await crrrngCoordinator.getDepositAmount(
                          signers[i].address,
                      )
                      if (depositedAmount < BigInt(minimumDepositAmount)) {
                          const tx = await crrrngCoordinator.connect(signers[i]).operatorDeposit({
                              value: BigInt(minimumDepositAmount) - depositedAmount,
                          })
                          await tx.wait()
                      }
                  }
                  // ** request randomWord
                  const provider = ethers.provider
                  const fee = await provider.getFeeData()
                  const gasPrice = fee.gasPrice as bigint
                  const directFundingCost = await crrrngCoordinator.estimateDirectFundingPrice(
                      callback_gaslimit,
                      gasPrice,
                  )
                  const tx = await consumerExample.requestRandomWord({
                      value: (directFundingCost * (100n + 1n)) / 100n,
                  })
                  await tx.wait()
                  // ** three operator commit
                  const numOfOperators = 3
                  const round = (await crrrngCoordinator.getNextRound()) - 1n
                  for (let i = 0; i < numOfOperators; i++) {
                      const tx = await crrrngCoordinator
                          .connect(signers[i])
                          .commit(round, commitParams[i])
                      await tx.wait()
                  }
                  // ** thirdSmallestHashSigner recover
                  await time.increase(1200n)
                  const txRecover = await crrrngCoordinator
                      .connect(thirdSmallestHashSigner)
                      .recover(round, recoverParams.y)
                  await txRecover.wait()
                  // ** fulfillRandomness by secondSmallestHashSigner
                  const disputePeriod = coordinatorConstructorParams.disputePeriod
                  await time.increase(BigInt(disputePeriod) + 1n)
                  const txFulfill = await crrrngCoordinator
                      .connect(secondSmallestHashSigner)
                      .fulfillRandomness(round)
                  await txFulfill.wait()

                  // ** disputeLeadershipAfterfufill by smallestHashSigner
                  const txDispute = await crrrngCoordinator
                      .connect(smallestHashSigner)
                      .disputeLeadershipAtRound(round)
                  await txDispute.wait()

                  // ** get
                  const getFulfillStatusAtRound =
                      await crrrngCoordinator.getFulfillStatusAtRound(round)
                  const depositAmountThird = await crrrngCoordinator.getDepositAmount(
                      thirdSmallestHashSigner.address,
                  )
                  const depositAmountSecond = await crrrngCoordinator.getDepositAmount(
                      secondSmallestHashSigner.address,
                  )
                  const depositAmount = await crrrngCoordinator.getDepositAmount(
                      smallestHashSigner.address,
                  )
                  const getCostAtRound = await crrrngCoordinator.getCostAtRound(round)

                  // ** assert

                  await expect(getFulfillStatusAtRound[0]).to.equal(true)
                  await expect(getFulfillStatusAtRound[1]).to.equal(true)
              })
          })
      })
