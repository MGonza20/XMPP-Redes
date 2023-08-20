const { client, xml } = require("@xmpp/client");
const readline = require('readline-sync');
const readlineAsync = require('readline');
const net = require('net');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const rl = readlineAsync.createInterface({ input: process.stdin, output: process.stdout });

const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => { resolve(answer) });
  });
};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const getUserInfo = () => {
  // let username = readline.question('Enter your username: ');
  // let password = readline.question('Enter your password: ');
  let username = 'pag20634';
  let password = '1234';
  return { username, password };
}

const mainMenu = async () => {
  console.log('\n--------------------   Main Menu   --------------------\n1. Login\n2. Register\n3. Exit\n')
  let selectedOption = await question('Select a menu option: ');
  return selectedOption;
}


const showMenuOptions = () => {
  console.log('\n--------------------   Menu   --------------------\n1. Show contacts and status\n2. Add user to contacts\n3. Define user details\n4. Show contact details\n5. Chat one to one with user\n6. Participate in group conversations\n7. Define presence message\n8. Enviar/recibir archivo\n9. Delete account\n10. Logout\n')
}

// Function to add a contact to the roster
const addContact = async (xmpp, contact_username) => {
  const Iq = xml(
      "iq",
      { type: "set" },
      xml("query", 
          { xmlns: "jabber:iq:roster" }, 
          xml("item", { jid: `${contact_username}@alumchat.xyz` }))
  );
  await xmpp.send(Iq);
  
  const handshake = xml( "presence", { type: "subscribe", to: `${contact_username}@alumchat.xyz` });
  await xmpp.send(handshake);
};

// Function to define, get and show user's vCard
const defineVCard = async (xmpp, vCardDetails) => {
  const vCardNewDetails = xml(
    "iq",
    { type: "set" },
    xml("vCard",
      { xmlns: "vcard-temp" },
      xml("FN", {}, vCardDetails.fullName),
      xml("NICKNAME", {}, vCardDetails.nickname),
      xml("EMAIL", {}, vCardDetails.email)
      )
  );
  await xmpp.send(vCardNewDetails);
};

const getVCardInfo = (xmpp, contact_username) => {
  return new Promise((resolve, reject) => {
    const vCardIq = xml(
      "iq",
      { type: "get", to: `${contact_username}@alumchat.xyz` },
      xml("vCard", { xmlns: "vcard-temp" })
    );

    xmpp.on('stanza', (stanza) => {
      if (stanza.is('iq') && stanza.getChild('vCard')) {
        resolve(stanza);
      }
    });
    xmpp.send(vCardIq);
  });
};

const showVCardInfo = (vCardDataFields) => {
  if (vCardDataFields.is("iq")) {
    const vCardDets = vCardDataFields.getChild("vCard", "vcard-temp");
    if (vCardDets) {
      if (vCardDets.children.length > 0) {
        console.log('\n--------------   Contact\'s details   -------------\n');
        vCardDets.children.forEach(field => {
          if (field && field.name && field.text) {
            console.log(`${field.name}: ${field.text()}`);
          }
        });
      } else {
        console.log('No details found for this contact.');
      }
    } 
  }
}


const uploadSlot = async (xmpp, filename, filesize) => {
  return new Promise((resolve, reject) => {
      const requestStanza = xml(
          "iq", { type: "get", to: "httpfileupload.alumchat.xyz", id: "slot_id" },
          xml("request", { xmlns: "urn:xmpp:http:upload:0", filename: filename, size: filesize, contentType: "image/jpeg" })
      );

      const rsStanza = (stanza) => {
          if (stanza.attrs.type === 'result' && stanza.is('iq') && stanza.attrs.id === 'slot_id') {
              xmpp.off('stanza', rsStanza); 
              resolve(stanza);
          }
      };
      
      xmpp.on('stanza', rsStanza);
      xmpp.send(requestStanza).catch((error) => {
          xmpp.off('stanza', rsStanza);  
          reject(error);
      });
  });
}


const uploadFile = async (filePath, putUrl) => {
  try {
      const data = fs.createReadStream(filePath);
      await axios.put(putUrl, data, { headers: { "Content-Type": "application/octet-stream" }});
      console.log("File uploaded");
  } catch (error) {
      console.error("Failed to upload file:", error);
  }
}

const deleteAccount = async (xmpp) => {
  return new Promise((resolve, reject) => {
    const deleteStanza = xml( "iq", { type: "set", id: "delete_id" },
                         xml("query", { xmlns: "jabber:iq:register" },
                         xml("remove")) );

    const response = (stanza) => {
      if (stanza.is('iq') && stanza.attrs.id === 'delete_id') {
        if (stanza.attrs.type === 'result') {
          resolve('Account deleted.');
        } else if (stanza.attrs.type === 'error') {
          reject('Error deleting account.');
        }
      }
    };

    xmpp.on('stanza', response);
    xmpp.send(deleteStanza);
  });
};






const login = async (xmpp, username) => {

  return new Promise((resolve, reject) => {

    xmpp.on("online", async () => {
      
      let contactsStatus = {};
      let receptorC = '';
      let option5 = false;
      let newMessages = {};

      const iqAllContacts = xml( 'iq', { type: 'get' }, xml('query', { xmlns: 'jabber:iq:roster' }));
      xmpp.send(iqAllContacts);


      xmpp.on("stanza", async (stanza) => {
        if (stanza.is('message') && stanza.attrs.type === 'chat' && stanza.getChild('body')) {
          if (stanza.getChild('body').children.length > 0) {
            const from = stanza.attrs.from.split('@')[0];
            newMessages[from] = newMessages[from] ? [...newMessages[from], stanza.getChildText('body')] : 
                                [stanza.getChildText('body')];

            for (contact in newMessages) {
              if (newMessages[contact].length > 1) {
                console.log(`\nYou have ${newMessages[contact].length} new messages from ${contact}`);
              } else if (newMessages[contact].length === 1){
                console.log(`\nYou have a new message from ${contact}!`);
              }
            }
            if (from === receptorC && option5) {
              const receivedMsg = stanza.getChildText('body');
              console.log(`\n${from}: ${receivedMsg}`);
            }
          }
        }
        if (stanza.is('message') && stanza.attrs.type === 'groupchat' && stanza.getChild('body')) {
          const from = stanza.attrs.from.split('/')[1];
          const receivedMsg = stanza.getChildText('body');
          console.log(`${from}: ${receivedMsg}`);
        }
        if (stanza.is('iq') && stanza.attrs.type === 'result') {
          const query = stanza.getChild('query');
          if (query && query.attrs.xmlns === 'jabber:iq:roster') {
            query.getChildren('item').forEach(item => {
              const jid = item.attrs.jid.split('@')[0];
              contactsStatus[jid] = { show: "offline", statusMsg: '', init: true }; 
            })
          }
        }  
        if (stanza.is('presence')) {
          const from = stanza.attrs.from.split('@')[0];
          if (from !== username) {
            const statusMsg = stanza.getChildText('status') || '';
            let show = stanza.attrs.type === 'unavailable' ? 'offline' : stanza.getChildText('show') || 'online';
            if (contactsStatus[from] && contactsStatus[from].init !== true) {
              console.log(`${from} changed status`);
              contactsStatus[from] = { ...contactsStatus[from], show: show, statusMsg: statusMsg };
            }             
            else {
              contactsStatus[from] = { show: show, statusMsg: statusMsg, init: false };
            } 
          }
        }

        if (stanza.is('presence') && stanza.attrs.type === 'subscribe') {
          const from = stanza.attrs.from;
          const presence = xml("presence", { type: "subscribed", to: from });
          await xmpp.send(presence);
        }
      });
    

      await xmpp.send(xml("presence"));
            
      while (true) {
        showMenuOptions();
        
        let selectedOption = await question('Select a menu option (or 10 to exit): ');
        switch (selectedOption) {
          case '1':
            if (Object.keys(contactsStatus).length > 0) {
              console.log("\n---------- Contacts and their status ----------");
              for (let contact in contactsStatus) {
                if (contactsStatus[contact].statusMsg){
                  console.log(`${contact}: ${contactsStatus[contact].show} - ${contactsStatus[contact].statusMsg}`);
                } else{
                  console.log(`${contact}: ${contactsStatus[contact].show}`);
                }
              }
            } else {
              console.log('You have no contacts yet.');
            };
            break;
        
          case '2':
            const contact_username = await question('Enter the contact\'s username: ');
            await addContact(xmpp, contact_username);
            break;
            
          case '3':
            const fullName = readline.question('Enter your full name: ');
            const nickname = readline.question('Enter your nickname: ');
            const email = readline.question('Enter your email: ');
            const vCardDetails = { fullName, nickname, email };
            await defineVCard(xmpp, vCardDetails);
            break;
            
          case '4':
            const contact_username_vcard = readline.question('Enter the contact\'s username: ');
            const vCardDataFields = await getVCardInfo(xmpp, contact_username_vcard);
            showVCardInfo(vCardDataFields);
            break;
          
          case '5':
            let receptor = await question('Enter the receptor\'s username: ');
            receptorC = receptor;
            option5 = true;

            if (newMessages[receptor]) {
              for (let i = 0; i < newMessages[receptor].length; i++) {
                console.log(`${receptor}: ${newMessages[receptor][i]}`);
              }
              newMessages[receptor] = [];
            }

    
            while (true) {
              const msg = await question('Enter your message (or press enter to end chat): ');
              if (msg === '') {
                console.log('Exiting chat...');
                option5 = false;
                break;
              }
    
              const messageStanza = xml(
                "message", { type: "chat", to: `${receptor}@alumchat.xyz` },
                xml("body", {}, msg)
              );
    
              await xmpp.send(messageStanza);
            }
            break;

          case '6':
            const groupchat = await question('Enter the group name where you want to join: ');
            const groupchatName = await question('Enter a group chat name for yourself: ');
            const groupJid = `${groupchat}@conference.alumchat.xyz/${groupchatName}`;
        
            const presenceGroupStanza = xml("presence", { to: `${groupJid}` });
            await xmpp.send(presenceGroupStanza);
                
            while (true) {
                const groupMsg = await question('Enter a message (or press enter to leave chat): ');
                if (groupMsg === '') {
                    console.log('Leaving group chat...');
                    const exitGroupPresence = xml("presence", { to: `${groupJid}`, type: "unavailable" });
                    await xmpp.send(exitGroupPresence);
                    break;
                }
        
                const groupMessageStanza = xml(
                  "message", { type: "groupchat", to: `${groupchat}@conference.alumchat.xyz` },
                  xml("body", {}, groupMsg)
                );
        
                await xmpp.send(groupMessageStanza);
            }
            break;

          case '7':
            const presenceMsg = await question('Enter your desired presence message: ');
            const presenceMsgStanza = xml("presence", {}, xml("status", {}, presenceMsg));
            await xmpp.send(presenceMsgStanza);
            break;

          case '8':
            const filePath = await question('Enter the file path: ');
            const filename = path.basename(filePath);
            const filesize = fs.statSync(filePath).size;
            
            try {
              const responseStanza = await uploadSlot(xmpp, filename, filesize);
              console.log("Success:", responseStanza.toString());
              const putUrl = responseStanza.getChild("slot").getChild("put").attrs.url;
              const getUrl = responseStanza.getChild("slot").getChild("get").attrs.url;
              await uploadFile(filePath, putUrl);
              console.log("Link:", getUrl);
            } catch (error) {
              console.error("Error:", error);
            }
            break;

          case '9':
            try {
              const response = await deleteAccount(xmpp);
              console.log(response);
              xmpp.stop(); 
              process.exit();
            } catch (error) {
              console.error(error);
            }
            break;

          case '10':
            console.log('Logging out...');
            xmpp.stop();
            rl.close();
            return;
          default:
            console.log('Invalid option. Try again.');
        }
      }
    });

    xmpp.on("error", (err) => {
      if (err.toString().includes("not-authorized")) { 
        console.log('Incorrect username or password. Try again.\n');
        xmpp.stop().then(resolve);
      }
    });
    
    xmpp.start().catch(() => {});
  })
};

const register = (username, password) => {
  return new Promise((resolve, reject) => {
    const HOST = 'alumchat.xyz';
    const PORT = 5222;

    const socket = new net.Socket();
    const contains = (data, str) => data.toString().includes(str);
    socket.on('data', (data) => {
      if (contains(data, 'type="result"') && contains(data, 'id="register_id"')) {
        console.log('Successful register!!!');
        socket.destroy();
        resolve();
      } else if (contains(data, 'type="error"') && contains(data, 'id="register_id"')) {
        console.log('Fail in register.');
        socket.destroy();
        resolve();
      }
    });
    
    socket.on('end', resolve);
    socket.connect(PORT, HOST, () => {
      socket.write(`<stream:stream to="'${HOST}'" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">`);
      const registerIq = `<iq type='set' id='register_id'>
                                <query xmlns='jabber:iq:register'>
                                  <username>${username}</username>
                                  <password>${password}</password>
                                </query>
                              </iq>`;
      socket.write(registerIq);
    });
  });
};


const main = async () => {
  
  run = true;
  while (run) {
    const mainMenuChoice = await mainMenu();
    
    switch (mainMenuChoice) {
      case '1':
        const userInfo = getUserInfo();
        const xmpp = client({
          service: "xmpp://alumchat.xyz",
          domain: "alumchat.xyz",
          username: userInfo.username,
          password: userInfo.password,
        });
  
        await login(xmpp, userInfo.username);
        break;
  
        case '2':
          const userInfoR = getUserInfo();
          await register(userInfoR.username, userInfoR.password)
          break;  
  
      case '3':
        console.log('Goodbye! Leaving XMPP chat...\n');
        run = false;
        rl.close();
        return;
  
      default:
        console.log('Invalid option. Try again.\n');
    }
  }
}

main()