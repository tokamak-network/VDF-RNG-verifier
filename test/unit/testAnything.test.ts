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
import { ethers, network } from "hardhat"
import { developmentChains } from "../../helper-hardhat-config"
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Test Anything", () => {
          it("get function selector by keccak256", async () => {
              console.log(
                  ethers.id(
                      "verifyRecursiveHalvingProof((bytes,uint256)[],(bytes,uint256),(bytes,uint256),(bytes,uint256),bytes,uint256,uint256)",
                  ),
              )
          })
          it("add new line for each 32bytes", async () => {
              const data =
                  "00000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000148000000000000000000000000000000000000000000000000000000000000015e0000000000000000000000000000000000000000000000000000000000000174000000000000000000000000000000000000000000000000000000000000018a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000000d00000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000046000000000000000000000000000000000000000000000000000000000000005c00000000000000000000000000000000000000000000000000000000000000720000000000000000000000000000000000000000000000000000000000000088000000000000000000000000000000000000000000000000000000000000009e00000000000000000000000000000000000000000000000000000000000000b400000000000000000000000000000000000000000000000000000000000000ca00000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000f6000000000000000000000000000000000000000000000000000000000000010c00000000000000000000000000000000000000000000000000000000000001220000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007ff00000000000000000000000000000000000000000000000000000000000001004150b33f0addc33dd17758387d4c2ced2be967d89bba0a06229095dfb75197551f733f73dedf4b8041c4bb96fb6131530f0af15d75a87a19e537a5616d0f5dca7d1eaf688930a989ff0ce4a0d1cd4863e060698563ae05efd73f58dc55d673a68d992da2dd94cbfda28886b2996acc659b469bcb50828337a24ded6fb83ccb8f8a0d84309008d51f4b187b4ceee43040a7db8e11a25fed091a22d9d3c24fef0ce27002f834f76c6807a7ea5c6944d6bccb869fea953420e33606c405b39a9b9518ff8a301e6b82683abe5eee56c650a3ff950bdc3cfdac7fefe840230e3abf3ba07e9e93fe9121a25006a4c7311da7ee7266f38aa03c74d30eca20f165a58109000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007ff00000000000000000000000000000000000000000000000000000000000001004d2883f2d5f3a2a524634c72f06e19cb23bf87c8877d19562f3a9901e94410928ba313f7696ac0fc515d8f4ab506367a4cd0dafb55cacb6ba985431053fd8817cf16e6e65caa8103081cf604a0ffdf873cc150c8c90eb001d42b81e547e900f458109c4676b4114bc258374d327a75b3dcb08ca01a11aa5872f65489885df56910a2bb3cb26806ba69fe9561131c29338baca6bd3dc8ab82e0be26987568c59a62aafb4b23762f84a72b536eb663fe66a5dcb3fc8e2df8c54fe1409379ff722f3da81f316626ca3b35e74642f43bc71eeb59ceee63e25a0bc0a136a2176b01b0ffbb25a20e132c0b14606fa642d971c1a8a986535193fc7e827ce3ca8e523301000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007fd000000000000000000000000000000000000000000000000000000000000010019e83eee8912d9fafb5dce18adceae7bec6bc7fcd48901b406068519c34a88c5d38d1b2597b4ab51d65d6a9a8e1c385c0be9621d28ef4114becc6af7f26e29797a179af92bd25014065528c79407c560038759b5849f28dad7ed1597eafa46d92accb5f6399c55e4873c03586f3c462fc5dc111af3713dea656bbdc43ecfa0d381104c0d7c8daa828d9fe3fb45d5c3d4c47fc0a5c01be1b25a70cbab51bb6a7fabbd3947996fe4a4d53d81671146ce3768a06b8563dd42aa5a23ab90f56269154134c186b853ce4277c574b837446a67ceb06a0ce5382e4a4edb54fca5c3cbb52908377165480e2775132652b4bbc6ad9dd660ed18a00691a88569cb5d701faf000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007fe00000000000000000000000000000000000000000000000000000000000001002418df5653003b665a6ee685c70a09faf0c66b684e0d6f893e4bc5c95b3d7428990ce648a7e0dbb1cb9838c7c1d7475c056b2e84feb2199af00fb485c336c38236bd9cff64567fa2162f75336af21c2ef652745244a0437b85708f8537fb204a578828dd09e8903fe6e1729dd71683ee69c523d020475296b9d97ed3f14545e8b50903800b1481124d2327bfafde559effcf2795947f002a93954963390f141906f3e2a654be376ea66d625e5e65483ef93590e53bed6a09ea3383d545c90c87c9e1b3b0a1a6c50561cc3564640078c2b940411ead7dec4da7ffb1cecba28871bed5df9038a4f312c6dac055a90ff59734c94c5de459cf8fb41c41979b1654f3000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007fe000000000000000000000000000000000000000000000000000000000000010029dee0b058bfd4b21f5606bb613b9b532e94e03f8132ca6eb49032a16967e5b493edb15fbc77de26ef290d405e1361bfb9f9bfdfa8d1a433bb6c7883b9d0b0a690cd362856ce8ca114f0354b28dcf25bb0612990b39ebebc05730edff6f7f2e39eba825703b1b4f47875c709264df64531d1d08442c4c7d08da9f48146a215bc2e24aab7fcf05d4dc73709a33d8fc2638f5aa12f1999ab8c985705ed6a3fc374d90f4e69aed799d798c5b70469e11027500a6ce9e60f5594fe5bd5d9e392c751978b5f602b3042a77b39536bc2c1c00bb5e3187cef9a8988a4f83eaf58ee91dabab11b530ced7f8eb4e5763fb48861e468179c9d0d87dde89e2b1bc71bfe95f6000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007fe00000000000000000000000000000000000000000000000000000000000001002f7fb536d3f8ba110d8a1104083abfab3de69ecdb9e2dc6212d34c47a4c5251c0558ad52b6f013d744c3dcf7e5f507e6bcda1e2c618999846ae57bcd75bf97d279e7b16735ff731c60a6e7bc76a6055337563a9fc39393006646d8a9fac944eb14294fc7334449d1aa8b5d47be5314e23a3804e657483c6a5ccf7d31bd11176e823f9f76884847399f42c1074a2cb9c6a43b06c357488d89f8d432ca32d86b4cfbec45b3e316744423d870ad237924a593d6ebac1b3370b0d3b24a2b1e150b00b05a5db6fba27d95fc8148caad0eaa1211df14ee7357c82ae05f0d5513c2b63570268519fd21fbbfbb50fb24513a6c0238219d6fc8d47aa49b17c5b9828a5347000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007fb00000000000000000000000000000000000000000000000000000000000001000539fea41a54453404d840695fe32cbd0957a5160ee2b4cf4353d90be082db469f19a07b3bfb17cdb3b28f04570160e10a6db3485057545a6044c7cecfdf7606e4f27e269bbfa396fc341364997dedc36a46e5dcb4856d2ed29ef37f4e4a3330e137aced1d096ed6761915224f3113a5cd4c64b0673755095d3132fa406e594c234cd1318925cd1c1298abf780a8fa504943233b94090b61c5cb895b9ef0ac3d7958720933cbc2bcc9c2aef747382f76bea48a886252c4ee3bf2fbe2169e03c77b369e56474d7f0f71e312b721cef8cbda709210232bffd17ce8569fdda236174d0f072cbf4ffd51030a156f0cab409a0f8fb05f1c7cc793121fb4410af5263a000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007fd00000000000000000000000000000000000000000000000000000000000001001f48c0d05bc3b48376e31ebef628638e0b5f81e69eb7d2d339eed5c4485ae1c39c793d8e7180381002b189644cbb8bf9a3fcfdd4a0fd3ef044725ddf67bb878d6c1fc43d7abcea6dde0e64620ed1aed0041c9d369f6c2f318ec9a8e7760a6265ff6d1c654138c9f299c91a3c00999db1b3b8741aaa14ee1ff790181b5bd3e0b8282ecea7b63df4106de2ffc73f30bf662007f4af0b5b6c6d4ca94ab137826e0a8b1d01150acd4c75153ec8312cbaf5b3ff76a64623a1550bc04541e1966ce6789fcc4f455aabe043870d327ea511bd6495dfccfc9d66027fb2d18efb467491905ee3f979cb341d032747070928d55038c1be063e36a785e0af1cc03f541f8621000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007ff0000000000000000000000000000000000000000000000000000000000000100429cdae2124b9b8cc4c8eafe9c0e04638947ed36667d6b1fccf82c78c669ed0c4235a0a1fa40117643fe660c3e3a1adf168fecd7b38656a4e81d87234c95e1d2d49475eac81bd6ec8394d6077800b2a9261d05c94576e3c25d8800de66825db2e5ec8f3b816adab9a23a063c2a5fd3df3891512400faf133b926daeb651c8d07e29c03ed8c50cb8f27463c85883b815b7897605a786cc35809940a33c1491634e9bb2f948337b804d1cc00f0bd9430d40b78ed7ab64c62e53cbd9b07662d63722654a7c666be227dc8cef1f892ee147c4da6f2416c1e061e10ff368420e3a6e4812e1a1cc91d3f81f646edf907d73376bec9f761736166a3f25d711fd642f75c000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007fb0000000000000000000000000000000000000000000000000000000000000100055940142fcfe75d1d479030b2cb30b9807aa74091b5ae571b436b06be775da6fcf7ff8c95e31c1c37854e6a978025aeaa75c5eeaa7e5e41fc70d848911f860a03fdc232f61beb51d48172fdb04b1a4893cfbb007bfed7fb50bd0762dfd4409da964e48d1b14db3d76dc674302fc0d8f72e3d70dfc1b501f65b45590ffcbc9062dbad3d00a44b82540dff99a27b51acc35efcd561dc720d289757381dfc886317aa7eb2a0875df74527c62a99afebd6613e15ce0bc5ee1e0609b9c2fa193a52d0af94e670aa5c8d24198aebe9cd14c92bdb5ff9fd06030b6eea58e684a6765bb2418130f6230f9937400c532c6083fcbe044cdf71acae261e1c0e1abb7aa491b000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007fd00000000000000000000000000000000000000000000000000000000000001001de5149e646915d49e34b392dcf93bed2c408f2eff20ae9d89b13fe7159224ba278a7c06e04d778d1e53a15236ed3c271fcbb9227ac30bbf6e8318a89eb10d4c6cef48a0a347b33d24b2853666753e52ed4cdfcd9d4ba0f358ede20df69666fb0e3f9bfbe0794c6ea9ebf4267d2c54e00bbffe50ed64ad14aab369b9140d536d8dcfd1490085a18219053d66b4aa11b34b35a13f02a5f993b238202c083935eeedf17a2d62c74003ea857476caf3be653ec38e3b0981962abda30c285b32e811788884d599b4f73903e8ee2db9a91f23e75e0cca1b726cc595e5b02113f2ffc84bbd931b37e6f2cf9b382affe0c279287faa5d1719e1cec4e18c1e9aae950f30000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007fe0000000000000000000000000000000000000000000000000000000000000100286fa07f19457f040fdc1ab33424616bcabacfc321fe1fbf1f79525ec24b137b547a4731c64ee890babb4bb517f616f22fb4efb31d0bca95c7ce7fdf8ca676d68a04b02d61595333fcf145733525fdb8e2c67f643311dd44f0d1c5b1ec6166cbf844ac7da49933f74513e5cae00750f666325178e06432a0ee8adb5d108a5e9a8c2eddf965d0c6cedc1892a8d8ec4381cca6a25e9dccbf2129249e44da82d47058a2e01297fb755c21241274c8cebb1fcb0df6b4a6c399b59aa2cdab0f429bab06ccfaae7d4f0bfae2fb7489f9c5c45c5ff361ed7d5c1df396117039d3a910cd34cccc74dc7b2c5db4872cd7500af4205958219c47dd697a6d516cc6e816046e000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007fd00000000000000000000000000000000000000000000000000000000000001001071737078f4bf7af8866eb3717b17198bbe3ab824d43d14710be4f090ccdeba3ec71bac1315f701c5b9e354774dd9961fba73d89a7fd5fa2d996758697bb9a3f3aae72dca9bf7e0a25fbe14c2849d09afc791caffd00eafa3bab54056bff668dd61b6a41ebd9239caad9690a02135f3112106d08daa827fb36b5d4bf664f63dd947752012facca1c97afe8e34f12f5304af1d2e0c8d35a59f32c31404de24ce1e64d4f4992ec252dfb725fcfe60cfc5fc228f97e781c0bd5b6177dfe5246125aa05a00f8c9ad4cea5cf06b0adb78873ba03fa37aebd3c9662ce8808dd18cee1bcfde61e3af3fa50a5816943afb334a7a7a66ca26accfac7f439bfbfe231ace9000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007fe000000000000000000000000000000000000000000000000000000000000010038e529da4f13d181bde19f9bed01f5c0b0d878f3c3f9ef2d9090e853184d93f1339ceae1462d35813811a3c5bed263c95b4ac973fc05e4a105e2085335ee46ea542eb6e327115aa7bd02340ad02210038223f894a75e51cf5d7a6ea24a5f0f59d24dae0cf838a9ef0f92127f506329717befc22d16d4dbdec430bed9c2ddcf9522fc2c33312abe9789bb115a79c8f96d3cccce995c392b4075c551c176f42e1ce38b2d382df1e2d1f491f1737a959398e76480d0316a31eec02c3c5e202954a06c7d442cd5cceb626c5cbb8831bbd634eb15a4bdf5fc3aa5c35b8cb93fa8be0ceb4529c40b8137bd3b2a3fe0b26b93f5be6fbd5602c5b33aaeba0c7b85b5e1ab000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007fd00000000000000000000000000000000000000000000000000000000000001001f2e87cc69a58369d67f80e9f875039467069966fd027fd767c76ac5688e7200652ab6326adfb8e3afc2292ffe0117dc77640eaa21e641ed138aa5040851da59a737951e9535d2a73eaa7d5f9c6974dacdedfc7b958a557eef6a94e637ea3be22364b80beb408f229f2a71875e823078752a2f9408a623069160d470574e8105c047ff8c6fe59a0cd65d257f01702fb126c78f1c94ab83f4999e2862dd8490267dcac83887f0c3e05dc1547337f8801282a95d387e99aeaeda204eeb20ead6b753504edc2e21b6f804800cf3ac00f01483ed078d7b3d6da4c072bd53f7981154e2de5052b678d6f287ba282b800f87b9179f78f1c437dc5441101440a89b4436000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000007ff00000000000000000000000000000000000000000000000000000000000001004e502cc741a1a63c4ae0cea62d6eefae5d0395e137075a15b515f0ced5c811334f06272c0f1e85c1bed5445025b039e42d0a949989e2c210c9b68b9af5ada8c0f72fa445ce8f4af9a2e56478c8a6b17a6f1c389445467fe096a4c35262e4b06a6ba67a419bcca5d565e698ead674fca78e5d91fdc18f854b8e43edbca302c5d2d2d47ce49afb7405a4db2e87c98c2fd0718af32c1881e4d6d762f624de2d57663754aedfb02cbcc944812d2f8de4f694c933a1c11ecdbb2e67cf22f410487d598ef3d82190feabf11b5a83a4a058cdda1def94cd244fd30412eb8fa6d467398c21a15af04bf55078d9c73e12e3d0f5939804845b1487fae1fb526fa583e27d7100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000200"
              let dataLocation = "  00"
              for (let i = 0; i < data.length; i += 64) {
                  console.log(data.slice(i, i + 64))
                  //   dataLocation = (parseInt(dataLocation, 16) + 32).toString(16).padStart(4, " ")
              }
              for (let i = 0; i < data.length; i += 64) {
                  console.log(dataLocation)
                  dataLocation = (parseInt(dataLocation, 16) + 32).toString(16).padStart(4, " ")
              }
          })
      })
