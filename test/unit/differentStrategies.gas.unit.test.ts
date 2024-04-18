// Copyright 2024 justin
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import { ContractTransactionReceipt, ContractTransactionResponse } from "ethers"
import { network, ethers } from "hardhat"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { time } from "@nomicfoundation/hardhat-network-helpers"
import {
    TestCase,
    GasReportsObjectV2,
    LAMDAs,
    Ts,
    GasReportsV2,
    TestCaseWithTInProof,
    TestCaseWithNTInProof,
} from "../shared/interfacesV2"
import fs from "fs"
import {
    createSimpleTestCase,
    createSimpleTestCaseWithT,
    createSimpleTestCaseWithNT,
    deployCRRWithNTInProofFixture,
    deployCRRWithTInProofFixture,
    deployCRRWithNTInProofVerifyAndProcessSeparateFixture,
    deployCommitRevealRecoverRNGTestFixture,
    deployCRRWithNTInProofVerifyAndProcessSeparateFileSeparateFixture,
    deployCRRWithNTInProofVerifyAndProcessSeparateFileSeparateWithoutOptimizerFixture,
} from "../shared/testFunctionsV2"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Different Stratigies CommitRevealRecover GAS TEST", () => {
          const chainId = network.config.chainId
          let commitDuration = networkConfig[chainId!].commitDuration
          let commitRevealDuration = networkConfig[chainId!].commitRevealDuration
          let signers: SignerWithAddress[]
          //FILE_DIR_NAME BY DATE
          const FILE_DIR_NAME =
              __dirname +
              `/gasDifferentStrategiesReports/${new Date().toISOString().slice(0, 19)}` +
              ".json"
          it("Commit Recover Most Optimized", async () => {
              const testcases: TestCase[][][] = createSimpleTestCase()
              const gasCostsCommitRecover: GasReportsObjectV2[][] = []
              signers = await ethers.getSigners()
              for (let i = 0; i < testcases.length; i++) {
                  gasCostsCommitRecover.push([])
                  for (let j = 0; j < testcases[i].length; j++) {
                      const { commitRevealRecoverRNG, receipt } = await loadFixture(
                          deployCommitRevealRecoverRNGTestFixture,
                      )
                      const key = `${LAMDAs[i]}${Ts[j]}`
                      gasCostsCommitRecover[i].push({
                          [key]: [],
                      })
                      for (let round: number = 0; round < testcases[i][j].length; round++) {
                          //   console.log("------------------")
                          //   console.log(`Lambda: ${LAMDAs[i]}`, ` T: ${Ts[j]}`)
                          const gasCostsPerFunction: GasReportsV2 = {
                              setUpGas: 0,
                              recoverGas: 0,
                              commitGas: [],
                              revealGas: [],
                              calculateOmegaGas: 0,
                              verifyRecursiveHalvingProofForSetup: 0,
                              verifyRecursiveHalvingProofForSetupInternalGasUsed: 0,
                              verifyRecursiveHalvingProofForRecovery: 0,
                              verifyRecursiveHalvingProofForRecoveryInternalGasUsed: 0,
                          }
                          //SetUp
                          let tx: ContractTransactionResponse = await commitRevealRecoverRNG.setUp(
                              commitDuration,
                              commitRevealDuration,
                              testcases[i][j][round].T,
                              testcases[i][j][round].n,
                              testcases[i][j][round].setupProofs,
                          )
                          let receipt: ContractTransactionReceipt | null = await tx.wait()
                          gasCostsPerFunction.setUpGas = receipt ? receipt.gasUsed.toString() : 0

                          // verifyRecursiveHalvingProofForSetup
                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTest(
                                  testcases[i][j][round].setupProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].setupProofs.length - 1,
                                  testcases[i][j][round].T,
                              )
                          receipt = await tx.wait()

                          gasCostsPerFunction.verifyRecursiveHalvingProofForSetup = receipt
                              ? receipt.gasUsed.toString()
                              : 0

                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTestInternalGas(
                                  testcases[i][j][round].setupProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].setupProofs.length - 1,
                                  testcases[i][j][round].T,
                              )
                          receipt = await tx.wait()
                          // get VerifyRecursiveHalvingProofGasUsed event
                          gasCostsPerFunction.verifyRecursiveHalvingProofForSetupInternalGasUsed =
                              commitRevealRecoverRNG.interface
                                  .parseLog({
                                      topics: receipt?.logs[0].topics as string[],
                                      data: receipt?.logs[0].data as string,
                                  })
                                  ?.args[0].toString() as string

                          //Commit
                          for (
                              let l: number = 0;
                              l < testcases[i][j][round].commitList.length;
                              l++
                          ) {
                              const tx = await commitRevealRecoverRNG
                                  .connect(signers[l])
                                  .commit(round, testcases[i][j][round].commitList[l])
                              const receipt = await tx.wait()
                              gasCostsPerFunction.commitGas.push(
                                  receipt ? receipt.gasUsed.toString() : 0,
                              )
                          }
                          await time.increase(commitDuration)

                          //Recover
                          tx = await commitRevealRecoverRNG.recover(
                              round,
                              testcases[i][j][round].recoveryProofs,
                          )
                          receipt = await tx.wait()
                          gasCostsPerFunction.recoverGas = receipt ? receipt.gasUsed.toString() : 0

                          // verifyRecursiveHalvingProofForRecovery
                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTest(
                                  testcases[i][j][round].recoveryProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].recoveryProofs.length - 1,
                                  testcases[i][j][round].T,
                              )
                          receipt = await tx.wait()
                          gasCostsPerFunction.verifyRecursiveHalvingProofForRecovery = receipt
                              ? receipt.gasUsed.toString()
                              : 0

                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTestInternalGas(
                                  testcases[i][j][round].recoveryProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].recoveryProofs.length - 1,
                                  testcases[i][j][round].T,
                              )
                          receipt = await tx.wait()

                          // get VerifyRecursiveHalvingProofGasUsed event
                          gasCostsPerFunction.verifyRecursiveHalvingProofForRecoveryInternalGasUsed =
                              commitRevealRecoverRNG.interface
                                  .parseLog({
                                      topics: receipt?.logs[0].topics as string[],
                                      data: receipt?.logs[0].data as string,
                                  })
                                  ?.args[0].toString() as string

                          // push gasCostsPerFunction
                          gasCostsCommitRecover[i][j][key].push(gasCostsPerFunction)
                      }
                  }
              }
              if (!fs.existsSync(FILE_DIR_NAME)) fs.writeFileSync(FILE_DIR_NAME, JSON.stringify({}))
              const jsonObject = JSON.parse(fs.readFileSync(FILE_DIR_NAME, "utf-8"))
              jsonObject["commitRecover"] = gasCostsCommitRecover
              fs.writeFileSync(FILE_DIR_NAME, JSON.stringify(jsonObject))
          })
          it("Commit Recover With T in Proof", async () => {
              const testcases: TestCaseWithTInProof[][][] = createSimpleTestCaseWithT()
              const gasCostsCommitRecover: GasReportsObjectV2[][] = []
              signers = await ethers.getSigners()
              for (let i = 0; i < testcases.length; i++) {
                  gasCostsCommitRecover.push([])
                  for (let j = 0; j < testcases[i].length; j++) {
                      const { commitRevealRecoverRNG, receipt } = await loadFixture(
                          deployCRRWithTInProofFixture,
                      )
                      const key = `${LAMDAs[i]}${Ts[j]}`
                      gasCostsCommitRecover[i].push({
                          [key]: [],
                      })
                      for (let round: number = 0; round < testcases[i][j].length; round++) {
                          //   console.log("------------------")
                          //   console.log(`Lambda: ${LAMDAs[i]}`, ` T: ${Ts[j]}`)
                          const gasCostsPerFunction: GasReportsV2 = {
                              setUpGas: 0,
                              recoverGas: 0,
                              commitGas: [],
                              revealGas: [],
                              calculateOmegaGas: 0,
                              verifyRecursiveHalvingProofForSetup: 0,
                              verifyRecursiveHalvingProofForSetupInternalGasUsed: 0,
                              verifyRecursiveHalvingProofForRecovery: 0,
                              verifyRecursiveHalvingProofForRecoveryInternalGasUsed: 0,
                          }
                          //SetUp
                          let tx: ContractTransactionResponse = await commitRevealRecoverRNG.setUp(
                              commitDuration,
                              commitRevealDuration,
                              testcases[i][j][round].n,
                              testcases[i][j][round].setupProofs,
                          )
                          let receipt: ContractTransactionReceipt | null = await tx.wait()
                          gasCostsPerFunction.setUpGas = receipt ? receipt.gasUsed.toString() : 0

                          // verifyRecursiveHalvingProofForSetup
                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTest(
                                  testcases[i][j][round].setupProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].setupProofs.length - 1,
                              )
                          receipt = await tx.wait()

                          gasCostsPerFunction.verifyRecursiveHalvingProofForSetup = receipt
                              ? receipt.gasUsed.toString()
                              : 0

                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTestInternalGas(
                                  testcases[i][j][round].setupProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].setupProofs.length - 1,
                              )
                          receipt = await tx.wait()
                          // get VerifyRecursiveHalvingProofGasUsed event
                          gasCostsPerFunction.verifyRecursiveHalvingProofForSetupInternalGasUsed =
                              commitRevealRecoverRNG.interface
                                  .parseLog({
                                      topics: receipt?.logs[0].topics as string[],
                                      data: receipt?.logs[0].data as string,
                                  })
                                  ?.args[0].toString() as string

                          //Commit
                          for (
                              let l: number = 0;
                              l < testcases[i][j][round].commitList.length;
                              l++
                          ) {
                              const tx = await commitRevealRecoverRNG
                                  .connect(signers[l])
                                  .commit(round, testcases[i][j][round].commitList[l])
                              const receipt = await tx.wait()
                              gasCostsPerFunction.commitGas.push(
                                  receipt ? receipt.gasUsed.toString() : 0,
                              )
                          }
                          await time.increase(commitDuration)

                          //Recover
                          tx = await commitRevealRecoverRNG.recover(
                              round,
                              testcases[i][j][round].recoveryProofs,
                          )
                          receipt = await tx.wait()
                          gasCostsPerFunction.recoverGas = receipt ? receipt.gasUsed.toString() : 0

                          // verifyRecursiveHalvingProofForRecovery
                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTest(
                                  testcases[i][j][round].recoveryProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].recoveryProofs.length - 1,
                              )
                          receipt = await tx.wait()
                          gasCostsPerFunction.verifyRecursiveHalvingProofForRecovery = receipt
                              ? receipt.gasUsed.toString()
                              : 0

                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTestInternalGas(
                                  testcases[i][j][round].recoveryProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].recoveryProofs.length - 1,
                              )
                          receipt = await tx.wait()

                          // get VerifyRecursiveHalvingProofGasUsed event
                          gasCostsPerFunction.verifyRecursiveHalvingProofForRecoveryInternalGasUsed =
                              commitRevealRecoverRNG.interface
                                  .parseLog({
                                      topics: receipt?.logs[0].topics as string[],
                                      data: receipt?.logs[0].data as string,
                                  })
                                  ?.args[0].toString() as string

                          // push gasCostsPerFunction
                          gasCostsCommitRecover[i][j][key].push(gasCostsPerFunction)
                      }
                  }
              }
              if (!fs.existsSync(FILE_DIR_NAME)) fs.writeFileSync(FILE_DIR_NAME, JSON.stringify({}))
              const jsonObject = JSON.parse(fs.readFileSync(FILE_DIR_NAME, "utf-8"))
              jsonObject["commitRecoverWithTInProof"] = gasCostsCommitRecover
              fs.writeFileSync(FILE_DIR_NAME, JSON.stringify(jsonObject))
          })
          it("Commit Recover With NT in Proof", async () => {
              const testcases: TestCaseWithNTInProof[][][] = createSimpleTestCaseWithNT()
              const gasCostsCommitRecover: GasReportsObjectV2[][] = []
              signers = await ethers.getSigners()
              for (let i = 0; i < testcases.length; i++) {
                  gasCostsCommitRecover.push([])
                  for (let j = 0; j < testcases[i].length; j++) {
                      const { commitRevealRecoverRNG, receipt } = await loadFixture(
                          deployCRRWithNTInProofFixture,
                      )
                      const key = `${LAMDAs[i]}${Ts[j]}`
                      gasCostsCommitRecover[i].push({
                          [key]: [],
                      })
                      for (let round: number = 0; round < testcases[i][j].length; round++) {
                          //   console.log("------------------")
                          //   console.log(`Lambda: ${LAMDAs[i]}`, ` T: ${Ts[j]}`)
                          const gasCostsPerFunction: GasReportsV2 = {
                              setUpGas: 0,
                              recoverGas: 0,
                              commitGas: [],
                              revealGas: [],
                              calculateOmegaGas: 0,
                              verifyRecursiveHalvingProofForSetup: 0,
                              verifyRecursiveHalvingProofForSetupInternalGasUsed: 0,
                              verifyRecursiveHalvingProofForRecovery: 0,
                              verifyRecursiveHalvingProofForRecoveryInternalGasUsed: 0,
                          }
                          //SetUp
                          let tx: ContractTransactionResponse = await commitRevealRecoverRNG.setUp(
                              commitDuration,
                              commitRevealDuration,
                              testcases[i][j][round].setupProofs,
                          )
                          let receipt: ContractTransactionReceipt | null = await tx.wait()
                          gasCostsPerFunction.setUpGas = receipt ? receipt.gasUsed.toString() : 0

                          // verifyRecursiveHalvingProofForSetup
                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTest(
                                  testcases[i][j][round].setupProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].setupProofs.length - 1,
                              )
                          receipt = await tx.wait()

                          gasCostsPerFunction.verifyRecursiveHalvingProofForSetup = receipt
                              ? receipt.gasUsed.toString()
                              : 0

                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTestInternalGas(
                                  testcases[i][j][round].setupProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].setupProofs.length - 1,
                              )
                          receipt = await tx.wait()
                          // get VerifyRecursiveHalvingProofGasUsed event
                          gasCostsPerFunction.verifyRecursiveHalvingProofForSetupInternalGasUsed =
                              commitRevealRecoverRNG.interface
                                  .parseLog({
                                      topics: receipt?.logs[0].topics as string[],
                                      data: receipt?.logs[0].data as string,
                                  })
                                  ?.args[0].toString() as string

                          //Commit
                          for (
                              let l: number = 0;
                              l < testcases[i][j][round].commitList.length;
                              l++
                          ) {
                              const tx = await commitRevealRecoverRNG
                                  .connect(signers[l])
                                  .commit(round, testcases[i][j][round].commitList[l])
                              const receipt = await tx.wait()
                              gasCostsPerFunction.commitGas.push(
                                  receipt ? receipt.gasUsed.toString() : 0,
                              )
                          }
                          await time.increase(commitDuration)

                          //Recover
                          tx = await commitRevealRecoverRNG.recover(
                              round,
                              testcases[i][j][round].recoveryProofs,
                          )
                          receipt = await tx.wait()
                          gasCostsPerFunction.recoverGas = receipt ? receipt.gasUsed.toString() : 0

                          // verifyRecursiveHalvingProofForRecovery
                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTest(
                                  testcases[i][j][round].recoveryProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].recoveryProofs.length - 1,
                              )
                          receipt = await tx.wait()
                          gasCostsPerFunction.verifyRecursiveHalvingProofForRecovery = receipt
                              ? receipt.gasUsed.toString()
                              : 0

                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTestInternalGas(
                                  testcases[i][j][round].recoveryProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].recoveryProofs.length - 1,
                              )
                          receipt = await tx.wait()

                          // get VerifyRecursiveHalvingProofGasUsed event
                          gasCostsPerFunction.verifyRecursiveHalvingProofForRecoveryInternalGasUsed =
                              commitRevealRecoverRNG.interface
                                  .parseLog({
                                      topics: receipt?.logs[0].topics as string[],
                                      data: receipt?.logs[0].data as string,
                                  })
                                  ?.args[0].toString() as string

                          // push gasCostsPerFunction
                          gasCostsCommitRecover[i][j][key].push(gasCostsPerFunction)
                      }
                  }
              }
              if (!fs.existsSync(FILE_DIR_NAME)) fs.writeFileSync(FILE_DIR_NAME, JSON.stringify({}))
              const jsonObject = JSON.parse(fs.readFileSync(FILE_DIR_NAME, "utf-8"))
              jsonObject["commitRecoverWithNTInProof"] = gasCostsCommitRecover
              fs.writeFileSync(FILE_DIR_NAME, JSON.stringify(jsonObject))
          })
          it("Commit Recover With NT in Proof Verify And Process Separate", async () => {
              const testcases: TestCaseWithNTInProof[][][] = createSimpleTestCaseWithNT()
              const gasCostsCommitRecover: GasReportsObjectV2[][] = []
              signers = await ethers.getSigners()
              for (let i = 0; i < testcases.length; i++) {
                  gasCostsCommitRecover.push([])
                  for (let j = 0; j < testcases[i].length; j++) {
                      const { commitRevealRecoverRNG, receipt } = await loadFixture(
                          deployCRRWithNTInProofVerifyAndProcessSeparateFixture,
                      )
                      const key = `${LAMDAs[i]}${Ts[j]}`
                      gasCostsCommitRecover[i].push({
                          [key]: [],
                      })
                      for (let round: number = 0; round < testcases[i][j].length; round++) {
                          //   console.log("------------------")
                          //   console.log(`Lambda: ${LAMDAs[i]}`, ` T: ${Ts[j]}`)
                          const gasCostsPerFunction: GasReportsV2 = {
                              setUpGas: 0,
                              recoverGas: 0,
                              commitGas: [],
                              revealGas: [],
                              calculateOmegaGas: 0,
                              verifyRecursiveHalvingProofForSetup: 0,
                              verifyRecursiveHalvingProofForSetupInternalGasUsed: 0,
                              verifyRecursiveHalvingProofForRecovery: 0,
                              verifyRecursiveHalvingProofForRecoveryInternalGasUsed: 0,
                          }
                          //SetUp
                          let tx: ContractTransactionResponse = await commitRevealRecoverRNG.setUp(
                              commitDuration,
                              commitRevealDuration,
                              testcases[i][j][round].setupProofs,
                          )
                          let receipt: ContractTransactionReceipt | null = await tx.wait()
                          gasCostsPerFunction.setUpGas = receipt ? receipt.gasUsed.toString() : 0

                          // verifyRecursiveHalvingProofForSetup
                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTest(
                                  testcases[i][j][round].setupProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].setupProofs.length,
                              )
                          receipt = await tx.wait()

                          gasCostsPerFunction.verifyRecursiveHalvingProofForSetup = receipt
                              ? receipt.gasUsed.toString()
                              : 0

                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTestInternalGas(
                                  testcases[i][j][round].setupProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].setupProofs.length,
                              )
                          receipt = await tx.wait()
                          // get VerifyRecursiveHalvingProofGasUsed event
                          gasCostsPerFunction.verifyRecursiveHalvingProofForSetupInternalGasUsed =
                              commitRevealRecoverRNG.interface
                                  .parseLog({
                                      topics: receipt?.logs[0].topics as string[],
                                      data: receipt?.logs[0].data as string,
                                  })
                                  ?.args[0].toString() as string

                          //Commit
                          for (
                              let l: number = 0;
                              l < testcases[i][j][round].commitList.length;
                              l++
                          ) {
                              const tx = await commitRevealRecoverRNG
                                  .connect(signers[l])
                                  .commit(round, testcases[i][j][round].commitList[l])
                              const receipt = await tx.wait()
                              gasCostsPerFunction.commitGas.push(
                                  receipt ? receipt.gasUsed.toString() : 0,
                              )
                          }
                          await time.increase(commitDuration)

                          //Recover
                          tx = await commitRevealRecoverRNG.recover(
                              round,
                              testcases[i][j][round].recoveryProofs,
                          )
                          receipt = await tx.wait()
                          gasCostsPerFunction.recoverGas = receipt ? receipt.gasUsed.toString() : 0

                          // verifyRecursiveHalvingProofForRecovery
                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTest(
                                  testcases[i][j][round].recoveryProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].recoveryProofs.length,
                              )
                          receipt = await tx.wait()
                          gasCostsPerFunction.verifyRecursiveHalvingProofForRecovery = receipt
                              ? receipt.gasUsed.toString()
                              : 0

                          tx =
                              await commitRevealRecoverRNG.verifyRecursiveHalvingProofExternalForTestInternalGas(
                                  testcases[i][j][round].recoveryProofs,
                                  testcases[i][j][round].n,
                                  testcases[i][j][round].recoveryProofs.length,
                              )
                          receipt = await tx.wait()

                          // get VerifyRecursiveHalvingProofGasUsed event
                          gasCostsPerFunction.verifyRecursiveHalvingProofForRecoveryInternalGasUsed =
                              commitRevealRecoverRNG.interface
                                  .parseLog({
                                      topics: receipt?.logs[0].topics as string[],
                                      data: receipt?.logs[0].data as string,
                                  })
                                  ?.args[0].toString() as string

                          // push gasCostsPerFunction
                          gasCostsCommitRecover[i][j][key].push(gasCostsPerFunction)
                      }
                  }
              }
              if (!fs.existsSync(FILE_DIR_NAME)) fs.writeFileSync(FILE_DIR_NAME, JSON.stringify({}))
              const jsonObject = JSON.parse(fs.readFileSync(FILE_DIR_NAME, "utf-8"))
              jsonObject["commitRecoverWithNTInProofVerifyAndProcessSeparate"] =
                  gasCostsCommitRecover
              fs.writeFileSync(FILE_DIR_NAME, JSON.stringify(jsonObject))
          })
          it("Commit Recover With NT in Proof Verify And Process Separate File Separate", async () => {
              const testcases: TestCaseWithNTInProof[][][] = createSimpleTestCaseWithNT()
              const gasCostsCommitRecover: GasReportsObjectV2[][] = []
              signers = await ethers.getSigners()
              for (let i = 0; i < testcases.length; i++) {
                  gasCostsCommitRecover.push([])
                  for (let j = 0; j < testcases[i].length; j++) {
                      const { commitRevealRecoverRNG, receipt } = await loadFixture(
                          deployCRRWithNTInProofVerifyAndProcessSeparateFileSeparateFixture,
                      )
                      const key = `${LAMDAs[i]}${Ts[j]}`
                      gasCostsCommitRecover[i].push({
                          [key]: [],
                      })
                      for (let round: number = 0; round < testcases[i][j].length; round++) {
                          //   console.log("------------------")
                          //   console.log(`Lambda: ${LAMDAs[i]}`, ` T: ${Ts[j]}`)
                          const gasCostsPerFunction: GasReportsV2 = {
                              setUpGas: 0,
                              recoverGas: 0,
                              commitGas: [],
                              revealGas: [],
                              calculateOmegaGas: 0,
                              verifyRecursiveHalvingProofForSetup: 0,
                              verifyRecursiveHalvingProofForSetupInternalGasUsed: 0,
                              verifyRecursiveHalvingProofForRecovery: 0,
                              verifyRecursiveHalvingProofForRecoveryInternalGasUsed: 0,
                          }
                          //SetUp
                          let tx: ContractTransactionResponse = await commitRevealRecoverRNG.setUp(
                              commitDuration,
                              commitRevealDuration,
                              testcases[i][j][round].setupProofs,
                          )
                          let receipt: ContractTransactionReceipt | null = await tx.wait()
                          gasCostsPerFunction.setUpGas = receipt ? receipt.gasUsed.toString() : 0

                          //Commit
                          for (
                              let l: number = 0;
                              l < testcases[i][j][round].commitList.length;
                              l++
                          ) {
                              const tx = await commitRevealRecoverRNG
                                  .connect(signers[l])
                                  .commit(round, testcases[i][j][round].commitList[l])
                              const receipt = await tx.wait()
                              gasCostsPerFunction.commitGas.push(
                                  receipt ? receipt.gasUsed.toString() : 0,
                              )
                          }
                          await time.increase(commitDuration)

                          //Recover
                          tx = await commitRevealRecoverRNG.recover(
                              round,
                              testcases[i][j][round].recoveryProofs,
                          )
                          receipt = await tx.wait()
                          gasCostsPerFunction.recoverGas = receipt ? receipt.gasUsed.toString() : 0

                          // push gasCostsPerFunction
                          gasCostsCommitRecover[i][j][key].push(gasCostsPerFunction)
                      }
                  }
              }
              if (!fs.existsSync(FILE_DIR_NAME)) fs.writeFileSync(FILE_DIR_NAME, JSON.stringify({}))
              const jsonObject = JSON.parse(fs.readFileSync(FILE_DIR_NAME, "utf-8"))
              jsonObject["commitRecoverWithNTInProofVerifyAndProcessSeparateFileSeparate"] =
                  gasCostsCommitRecover
              fs.writeFileSync(FILE_DIR_NAME, JSON.stringify(jsonObject))
          })
          it("Commit Recover With NT in Proof Verify And Process Separate File Separate Without Optimizer", async () => {
              const testcases: TestCaseWithNTInProof[][][] = createSimpleTestCaseWithNT()
              const gasCostsCommitRecover: GasReportsObjectV2[][] = []
              signers = await ethers.getSigners()
              for (let i = 0; i < testcases.length; i++) {
                  gasCostsCommitRecover.push([])
                  for (let j = 0; j < testcases[i].length; j++) {
                      const { commitRevealRecoverRNG, receipt } = await loadFixture(
                          deployCRRWithNTInProofVerifyAndProcessSeparateFileSeparateWithoutOptimizerFixture,
                      )
                      const key = `${LAMDAs[i]}${Ts[j]}`
                      gasCostsCommitRecover[i].push({
                          [key]: [],
                      })
                      for (let round: number = 0; round < testcases[i][j].length; round++) {
                          //   console.log("------------------")
                          //   console.log(`Lambda: ${LAMDAs[i]}`, ` T: ${Ts[j]}`)
                          const gasCostsPerFunction: GasReportsV2 = {
                              setUpGas: 0,
                              recoverGas: 0,
                              commitGas: [],
                              revealGas: [],
                              calculateOmegaGas: 0,
                              verifyRecursiveHalvingProofForSetup: 0,
                              verifyRecursiveHalvingProofForSetupInternalGasUsed: 0,
                              verifyRecursiveHalvingProofForRecovery: 0,
                              verifyRecursiveHalvingProofForRecoveryInternalGasUsed: 0,
                          }
                          //SetUp
                          let tx: ContractTransactionResponse = await commitRevealRecoverRNG.setUp(
                              commitDuration,
                              commitRevealDuration,
                              testcases[i][j][round].setupProofs,
                          )
                          let receipt: ContractTransactionReceipt | null = await tx.wait()
                          gasCostsPerFunction.setUpGas = receipt ? receipt.gasUsed.toString() : 0

                          //Commit
                          for (
                              let l: number = 0;
                              l < testcases[i][j][round].commitList.length;
                              l++
                          ) {
                              const tx = await commitRevealRecoverRNG
                                  .connect(signers[l])
                                  .commit(round, testcases[i][j][round].commitList[l])
                              const receipt = await tx.wait()
                              gasCostsPerFunction.commitGas.push(
                                  receipt ? receipt.gasUsed.toString() : 0,
                              )
                          }
                          await time.increase(commitDuration)

                          //Recover
                          tx = await commitRevealRecoverRNG.recover(
                              round,
                              testcases[i][j][round].recoveryProofs,
                          )
                          receipt = await tx.wait()
                          gasCostsPerFunction.recoverGas = receipt ? receipt.gasUsed.toString() : 0

                          // push gasCostsPerFunction
                          gasCostsCommitRecover[i][j][key].push(gasCostsPerFunction)
                      }
                  }
              }
              if (!fs.existsSync(FILE_DIR_NAME)) fs.writeFileSync(FILE_DIR_NAME, JSON.stringify({}))
              const jsonObject = JSON.parse(fs.readFileSync(FILE_DIR_NAME, "utf-8"))
              jsonObject[
                  "commitRecoverWithNTInProofVerifyAndProcessSeparateFileSeparateWithoutOptimizer"
              ] = gasCostsCommitRecover
              fs.writeFileSync(FILE_DIR_NAME, JSON.stringify(jsonObject))
          })
      })
