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
import fs from "fs"
import { ethers, network } from "hardhat"
const FRONT_END_ADDRESS_FILE_CONSUMER =
    __dirname + "/../../demo-front/constants/consumerContractAddress.json"
const FRONT_END_ADDRESS_FILE_COORDINATOR =
    __dirname + "/../../demo-front/constants/coordinatorContractAddress.json"
const FRONT_END_ABI_FILE_CONSUMER =
    __dirname + "/../../demo-front/constants/airdropConsumerAbi.json"
const FRONT_END_ABI_FILE_COORDINATOR = __dirname + "/../../demo-front/constants/crrngAbi.json"
export default async function updateFrontEnd() {
    if (process.env.UPDATE_ABI_ADDRESS_FRONTEND_VDFPROVER) {
        console.log("Updating frontend with VDFProver contract address and ABI...")
        await updateContractAddress()
        await updateAbi()
    }
}
async function updateAbi() {
    const airdropConsumer = await ethers.getContract("AirdropConsumer")
    fs.writeFileSync(FRONT_END_ABI_FILE_CONSUMER, airdropConsumer.interface.formatJson())
    const crrngCoordinator = await ethers.getContract("CRRRNGCoordinator")
    fs.writeFileSync(FRONT_END_ABI_FILE_COORDINATOR, crrngCoordinator.interface.formatJson())
}
async function updateContractAddress() {
    // airdropConsumer
    const airdropConsumer = await ethers.getContract("AirdropConsumer")
    const chainId = network.config.chainId?.toString()
    const currentAddress = JSON.parse(fs.readFileSync(FRONT_END_ADDRESS_FILE_CONSUMER, "utf8"))
    if (chainId! in currentAddress) {
        if (!currentAddress[chainId!].includes(await airdropConsumer.getAddress())) {
            currentAddress[chainId!].push(await airdropConsumer.getAddress())
        }
    } else {
        currentAddress[chainId!] = [await airdropConsumer.getAddress()]
    }
    fs.writeFileSync(FRONT_END_ADDRESS_FILE_CONSUMER, JSON.stringify(currentAddress))
    // crrngCoordinator
    const crrngCoordinator = await ethers.getContract("CRRRNGCoordinator")
    const currentAddressCoordinator = JSON.parse(
        fs.readFileSync(FRONT_END_ADDRESS_FILE_COORDINATOR, "utf8"),
    )
    if (chainId! in currentAddressCoordinator) {
        if (!currentAddressCoordinator[chainId!].includes(await crrngCoordinator.getAddress())) {
            currentAddressCoordinator[chainId!].push(await crrngCoordinator.getAddress())
        }
    } else {
        currentAddressCoordinator[chainId!] = [await crrngCoordinator.getAddress()]
    }
    fs.writeFileSync(FRONT_END_ADDRESS_FILE_COORDINATOR, JSON.stringify(currentAddressCoordinator))
}
updateFrontEnd.tags = ["all", "frontend"]
