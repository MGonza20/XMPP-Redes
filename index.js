const { client, xml } = require("@xmpp/client");
const readlineAsync = require('readline');
const net = require('net');
const fs = require('fs');

// async readline to be able to use await and async in the question method
// also to handle async functions
const rl = readlineAsync.createInterface({ input: process.stdin, output: process.stdout });

// async function to be able to use await and async in the question method
const question = (input) => {
  return new Promise((resolve) => {
    rl.question(input, (output) => { resolve(output) });
  });
};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const getUserInfo = async () => {
  let username = await question('Enter your username: ');
  let password = await question('Enter your password: ');
  // let username = 'pag20634';
  // let password = '1234';
  return { username, password };
}

const mainMenu = async () => {
  console.log('\n--------------------   Main Menu   --------------------\n1. Login\n2. Register\n3. Exit\n')
  let selectedOption = await question('Select a menu option: ');
  return selectedOption;
}


const showMenuOptions = () => {
  console.log('\n--------------------   Menu   --------------------\n1. Show contacts and status\n2. Add user to contacts\n3. Define user details\n4. Show contact details\n5. Chat one to one with user\n6. Participate in group conversations\n7. Define presence message\n8. Delete account\n9. Logout\n')
}


/**
 * Method to add a contact to the roster
 * @param {Object} xmpp - XMPP client
 * @param {String} contact_username - Contact's username to be added
 * 
 * In order to add a contact is necessary to send an IQ stanza adding the contact to the roster
 * and a handshake to be able to subscribe to the contact's presence.
 **/
const addContact = async (xmpp, contact_username) => {
  const Iq = xml(
      "iq", { type: "set" },
      xml("query", { xmlns: "jabber:iq:roster" }, 
      xml("item", { jid: `${contact_username}@alumchat.xyz` }))
  );
  await xmpp.send(Iq);
  
  const handshake = xml( "presence", { type: "subscribe", to: `${contact_username}@alumchat.xyz` });
  await xmpp.send(handshake);
};

/**
 * Method to define the user's vCard details (full name, nickname and email)
 * @param {Object} xmpp 
 * @param {Object} vCardDetails
 * Sending an IQ stanza with the user's details
 */
const defineVCard = async (xmpp, vCardDetails) => {
  const vCardNewDetails = xml("iq",{ type: "set" },
                          xml("vCard", { xmlns: "vcard-temp" },
                          xml("FN", {}, vCardDetails.fullName),
                          xml("NICKNAME", {}, vCardDetails.nickname),
                          xml("EMAIL", {}, vCardDetails.email)));
  await xmpp.send(vCardNewDetails);
};

/**
 * Function to get the vCard details of a contact
 * @param {Object} xmpp
 * @param {String} contact_username
 * @returns {Object} vCard details response stanza
 **/
const getVCardInfo = (xmpp, contact_username) => {
  return new Promise((resolve, reject) => {
    const vCardIq = xml( "iq", { type: "get", to: `${contact_username}@alumchat.xyz` },
                    xml("vCard", { xmlns: "vcard-temp" }));

    xmpp.on('stanza', (stanza) => {
      if (stanza.is('iq') && stanza.getChild('vCard')) {
        resolve(stanza);
      }
    });
    xmpp.send(vCardIq);
  });
};

/**
 * Method to show the vCard details of a contact
 * @param {Object} vCardDataFields
 * Created to ease the process of showing the vCard details of a contact
 **/
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
        console.log('No v-card details found for this contact.');
      }
    } 
  }
}

/**
 * Function to delete an specific account
 * @param {Object} xmpp 
 * @returns {String} response - Response of the server after deleting the account
 */
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



/**
 * Function to login to the XMPP server
 * @param {Object} xmpp 
 * @param {String} username 
 */
const login = async (xmpp, username) => {

  return new Promise((resolve, reject) => {
    xmpp.on("online", async () => {
      
      let contactsStatus = {}; // Object to store the contacts and their status
      let receptorC = ''; // Variable to store the receptor of the chat
      let option5 = false; // Variable flag to know if the user is in a chat or not
      let newMessages = {}; // Object to store the new messages received to 
                            // handle notifications and show them when the user enters the chat

      // Initially getting all the contacts from the roster
      const iqAllContacts = xml( 'iq', { type: 'get' }, xml('query', { xmlns: 'jabber:iq:roster' }));
      xmpp.send(iqAllContacts);


      xmpp.on("stanza", async (stanza) => {

        // stanza to handle one to one chat messages
        if (stanza.is('message') && stanza.attrs.type === 'chat' && stanza.getChild('body')) {
          if (stanza.getChild('body').children.length > 0) {
            const from = stanza.attrs.from.split('@')[0];
            newMessages[from] = newMessages[from] ? [...newMessages[from], stanza.getChildText('body')] : 
                                [stanza.getChildText('body')];

            // handling new messages notifications
            for (contact in newMessages) {
              if (!(contact === receptorC)){
                if (newMessages[contact].length > 1) {
                  console.log(`You have ${newMessages[contact].length} new messages from ${contact}!`);
                } else if (newMessages[contact].length === 1){
                  console.log(`You have a new message from ${contact}!`);
                }
              }
            }
            // handling messages received in the chat
            if (from === receptorC && option5) {
              const receivedMsg = stanza.getChildText('body');
              if (receivedMsg.includes('file-')) {
                const fileExtension = receivedMsg.split('file-')[1].split('://')[0];
                const fileBase64 = receivedMsg.split('file-')[1].split('://')[1];
                const fileBuffer = Buffer.from(fileBase64, 'base64');
                fs.writeFileSync(`./receivedFile.${fileExtension}`, fileBuffer);
                console.log(`File received from ${from}!`);
              } else {
                console.log(`${from}: ${receivedMsg}`);
              }
            }
          }
        }

        // stanza to handle group chat messages
        if (stanza.is('message') && stanza.attrs.type === 'groupchat' && stanza.getChild('body')) {
          const from = stanza.attrs.from.split('/')[1];
          const receivedMsg = stanza.getChildText('body');
          if (receivedMsg.includes('file-')) {
            const fileExtension = receivedMsg.split('file-')[1].split('://')[0];
            const fileBase64 = receivedMsg.split('file-')[1].split('://')[1];
            const fileBuffer = Buffer.from(fileBase64, 'base64');
            fs.writeFileSync(`./receivedFile.${fileExtension}`, fileBuffer);
            console.log(`File received from ${from}!`);
          } else {
            console.log(`${from}: ${receivedMsg}`);
          }
        }

        // stanza to initially handle the contacts and their status from roster when logging in
        if (stanza.is('iq') && stanza.attrs.type === 'result') {
          const query = stanza.getChild('query');
          if (query && query.attrs.xmlns === 'jabber:iq:roster') {
            query.getChildren('item').forEach(item => {
              const jid = item.attrs.jid.split('@')[0];
              const veri = item.attrs.jid.split('@')[1];
              if (!(veri.includes('conference'))){
                contactsStatus[jid] = { show: "offline", statusMsg: '', init: true }; 
              }
            })
          }
        }  

        // stanza to handle the contacts and their status when they change
        if (stanza.is('presence')) {
          const from = stanza.attrs.from.split('@')[0];
          const veri2 = stanza.attrs.from.split('@')[1];
          if (!(veri2.includes('conference'))){
            if (from !== username) {
              const statusMsg = stanza.getChildText('status') || '';
              let show = stanza.attrs.type === 'unavailable' ? 'offline' : stanza.getChildText('show') || 'online';
              if (contactsStatus[from] && contactsStatus[from].init !== true) {
                if (contactsStatus[from].show !== show || contactsStatus[from].statusMsg !== statusMsg) {
                  console.log(`${from} changed status`);
                }
                contactsStatus[from] = { ...contactsStatus[from], show: show, statusMsg: statusMsg };
              }             
              else {
                contactsStatus[from] = { show: show, statusMsg: statusMsg, init: false };
              } 
            }
          }
        }
        
        // stanza to handle the subscription requests from other users
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

          // handling all menu options
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
            contactsStatus[contact_username] = { show: "offline", statusMsg: '', init: true };
            break;
            
          case '3':
            const fullName = await question('Enter your full name: ');
            const nickname = await question('Enter your nickname: ');
            const email = await question('Enter your email: ');
            const vCardDetails = { fullName, nickname, email };
            await defineVCard(xmpp, vCardDetails);
            break;
            
          case '4':
            const contact_username_vcard = await question('Enter the contact\'s username: ');
            const vCardDataFields = await getVCardInfo(xmpp, contact_username_vcard);
            showVCardInfo(vCardDataFields);
            if (contactsStatus[contact_username_vcard]){
              console.log('Status: ', contactsStatus[contact_username_vcard].show);
              if (contactsStatus[contact_username_vcard].statusMsg) {
                console.log('Status message: ', contactsStatus[contact_username_vcard].statusMsg);
              }
            } else {
              console.log('This user is not in your contacts.');
            }
            break;
          
          case '5':
            let receptor = await question('Enter the receptor\'s username: ');
            receptorC = receptor;
            option5 = true;

            console.log('\nEspecial commands:\n1. To end chat press key \'enter\'\n2. To send file type \'package\'\n ');

            if (newMessages[receptor]) {
              for (let i = 0; i < newMessages[receptor].length; i++) {
                console.log(`${receptor}: ${newMessages[receptor][i]}`);
              }
              newMessages[receptor] = [];
            }

            while (true) {
              const msg = await question('Enter your message: ');
              if (msg === '') {
                console.log('Exiting chat...');
                option5 = false;
                break;
              }
              if (msg === 'package') {
                const filePath = await question('Enter the file path: ');
                const fileExtension = filePath.split('.').pop();
                const fileBase64 = fs.readFileSync(filePath).toString('base64');

                const package = `file-${fileExtension}://${fileBase64}`;

                const fileStanza = xml(
                  "message", { type: "chat", to: `${receptor}@alumchat.xyz` },
                  xml("body", {}, package)
                );
                await xmpp.send(fileStanza);
              } else {
                const messageStanza = xml(
                  "message", { type: "chat", to: `${receptor}@alumchat.xyz` },
                  xml("body", {}, msg)
                );
      
                await xmpp.send(messageStanza);
              }
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
            try {
              const response = await deleteAccount(xmpp);
              console.log(response);
              xmpp.stop(); 
              process.exit();
            } catch (error) {
              console.error(error);
            }
            break;

          case '9':
            console.log('Logging out...');
            xmpp.stop();
            rl.close();
            return;
          default:
            console.log('Invalid option. Try again.');
        }
      }
    });

    // handling not authorized error
    xmpp.on("error", (err) => {
      if (err.toString().includes("not-authorized")) { 
        console.log('Incorrect username or password. Try again.\n');
        xmpp.stop().then(resolve);
      }
    });
    
    xmpp.start().catch(() => {});
  })
};

/**
 * Function to register a new account
 * @param {String} username
 * @param {String} password
 * @returns {Promise} - Promise to handle the register process
 */
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
    
    // Connecting through socket to the XMPP server - TCP connection
    socket.on('end', resolve);
    socket.connect(PORT, HOST, () => {

      // Sending the initial stream to the server
      socket.write(`<stream:stream to="'${HOST}'" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">`);
      const registerIq = `<iq type='set' id='register_id'>
                                <query xmlns='jabber:iq:register'>
                                  <username>${username}</username>
                                  <password>${password}</password>
                                </query>
                              </iq>`;
      // Sending the register IQ stanza to the server
      socket.write(registerIq);
    });
  });
};


/**
 * Main function to handle the main menu options
 * @returns {Promise} - Promise to handle the main menu options
 */

const main = async () => {
  
  run = true;
  while (run) {
    const mainMenuChoice = await mainMenu();
    
    switch (mainMenuChoice) {
      case '1':
        const userInfo = await getUserInfo();
        const xmpp = client({
          service: "xmpp://alumchat.xyz",
          domain: "alumchat.xyz",
          username: userInfo.username,
          password: userInfo.password,
        });
  
        await login(xmpp, userInfo.username);
        break;
  
        case '2':
          const userInfoR = await getUserInfo();
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