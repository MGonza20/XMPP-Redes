const { client, xml } = require("@xmpp/client");
const readline = require('readline-sync');
const readlineAsync = require('readline');
const net = require('net');

const rl = readlineAsync.createInterface({
  input: process.stdin,
  output: process.stdout
});


const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
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
  console.log('\n--------------------   Menu   --------------------\n1. Show contacts and status\n2. Add user to contacts\n3. Define user details\n4. Show contact details\n5. Chat one to one with user\n6. Participar en conversaciones grupales\n7. Definir mensaje de presencia\n8. Enviar/recibir notificaciones\n9. Enviar/recibir archivo\n10. Logout\n')
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


const login = async (xmpp) => {

  return new Promise((resolve, reject) => {

    xmpp.on("online", async () => {
      
      let contactsStatus = {};
      let first
      xmpp.on("stanza", (stanza) => {
        if (stanza.is('message') && stanza.attrs.type === 'chat' && stanza.getChild('body')) {
          const from = stanza.attrs.from.split('@')[0];
          const receivedMsg = stanza.getChildText('body');
          console.log(`\n${from}: ${receivedMsg}`);
        }
        if (stanza.is('message') && stanza.attrs.type === 'groupchat' && stanza.getChild('body')) {
          const from = stanza.attrs.from.split('/')[1];
          const receivedMsg = stanza.getChildText('body');
          console.log(`${from}: ${receivedMsg}`);
        }
        if (stanza.is('presence')) {
          const from = stanza.attrs.from.split('@')[0];
          const show = stanza.getChildText('show') || "online";
          const status = stanza.getChildText('status');
      
          contactsStatus[from] = { show: show, status: status };
        }
      });
    

      await xmpp.send(xml("presence"));
            
      while (true) {
        showMenuOptions();
        
        let selectedOption = await question('Select a menu option (or 10 to exit): ');
        switch (selectedOption) {
          case '1':
            console.log("\n---------- Contacts and their status ----------");
            for (let contact in contactsStatus) {
              console.log(`${contact}: ${contactsStatus[contact].show} - ${contactsStatus[contact].status || 'NO STATUS'}`);
            }
            break;
        
          case '2':
            const contact_username = readline.question('Enter the contact\'s username: ');
            await addContact(xmpp, contact_username);
            console.log(`Contact added!\n`);
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
    
            while (true) {
              const msg = await question('Enter your message (or press enter to end chat): ');
              if (msg === '') {
                console.log('Exiting chat...');
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
            console.log('Not implemented yet.');
            break;
          case '8':
            console.log('Not implemented yet.');
            break;
          case '9':
            console.log('Not implemented yet.');
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
  
        await login(xmpp);
        break;
  
        case '2':
          const userInfoR = getUserInfo();
          await register(userInfoR.username, userInfoR.password)
          break;  
  
      case '3':
        console.log('Goodbye! Leaving XMPP chat...\n');
        run = false;
        return;
  
      default:
        console.log('Invalid option. Try again.\n');
    }
  }
}

main()