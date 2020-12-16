const socket = io("https://emote-server.herokuapp.com/")

const emojiRegex = /(\p{Emoji})|(\p{Emoji_Presentation})|(\p{Emoji_Modifier})|(\p{Emoji_Modifier_Base})|(\p{Emoji_Component})|(\p{Extended_Pictographic})/gu
const AsciiRegex = /[ -~]+/g

let currentInputValue = ""
let yourName = ""
let receptive = false

const messageForm = document.getElementById("message-form")
const emojiChatInput = document.getElementById("emoji-chat-input")
const messageContainer = document.getElementById("message-container")
const chatFromOtherTemplate = document.getElementById("chat-from-other-template")
const chatFromSelfTemplate = document.getElementById("chat-from-self-template")
const notificationTemplate = document.getElementById("notification-template")
const usersList = document.getElementById("users-list")

const modal = document.getElementById("modal")
const emojiNameInput = document.getElementById("emoji-name-input")

modal.addEventListener("submit", e => {
    e.preventDefault()
    yourName = removeNonEmojis(emojiNameInput.value)
    if(yourName === "") return
    socket.emit("new-user", yourName)
})

socket.on("name-not-allowed", msg => {
    modal.querySelector("label").innerText = msg
    emojiNameInput.value = ""
})

socket.on("name-free", users => {
    modal.remove();
    document.getElementById("overlay").remove()
    receptive = true
    addMessage(createNotificationMessage(`👋 Welcome to Emote, ${yourName}!`))
    users.forEach(name => {
        addUserToList(name)
    })
})

emojiNameInput.addEventListener("input", e => {
    yourName = emojiInputHandler(e, emojiNameInput, yourName) 
})

emojiChatInput.addEventListener("input", e => {
    currentInputValue = emojiInputHandler(e, emojiChatInput, currentInputValue)
})

function emojiInputHandler(e, inputElem, currentValue) {
    if(e.data == null || isEmojiOnly(e.data)) 
        return inputElem.value
    // else if text just inputted has non emojis
    const cursorPosition = inputElem.selectionStart - 1
    inputElem.value = currentValue
    inputElem.setSelectionRange(cursorPosition, cursorPosition)
    return currentValue
}

emojiNameInput.addEventListener("paste", emojiPasteHandler)

emojiChatInput.addEventListener("paste", emojiPasteHandler)

function emojiPasteHandler(e) {
    if(!isEmojiOnly(e.clipboardData.getData("text"))) {
        e.preventDefault()
    }
}

messageForm.addEventListener("submit", e => {
    e.preventDefault()
    currentInputValue = removeNonEmojis(emojiChatInput.value)
    if(currentInputValue === "") return
    messageSelf()
    emojiChatInput.value = ""
    currentInputValue = ""
})

function isEmojiOnly(str) {
    if("" === str.replace(emojiRegex, "") && !str.match(AsciiRegex))
        return true
    return false
}

function removeNonEmojis(str) { // safeguard for foulplay using inspect element
    return str.replace(AsciiRegex, "")
}

function messageSelf() {
    addMessage(createChatMessageFromSelf(currentInputValue))
    socket.emit("send-message", currentInputValue) 
}

socket.on("conversation-prompt", msg => {
    const messageHtml = `💡 Conversation Prompt 💡 <div style="font-weight: bold"># ${msg}</div>`
    addMessage(createNotificationMessage(messageHtml, true))
})

socket.on("receive-message", data => {
    addMessage(createChatMessageFromOther(data))
})

socket.on("user-connected", name => {
    addMessage(createNotificationMessage(`${name} joined`))
    addUserToList(name)
})

socket.on("user-disconnected", name => {
    addMessage(createNotificationMessage(`${name} left`))
    usersList.querySelector(`[data-name="${name}"]`).remove()
})

function addUserToList(name) {
    if(!receptive) return
    const nameListItem = document.createElement("li")
    nameListItem.innerText = name === yourName ? `You (${name})` : name
    nameListItem.dataset.name = name
    usersList.append(nameListItem)
}

function addMessage(msgElem) {
    if(!receptive) return
    const shouldScrollToBottom = msgElem.querySelector(".message").classList.contains("chat-from-self") || isScrolledToBottom(messageContainer) // 5 pixel is wiggle room
    messageContainer.append(msgElem)
    if(shouldScrollToBottom)
    messageContainer.scrollTop = messageContainer.scrollHeight
}

function createNotificationMessage(msg) {
    const notification = notificationTemplate.content.cloneNode(true)
    notification.querySelector(".notification").innerHTML = msg
    return notification
}

function createChatMessageFromOther(data) {
    const chat = chatFromOtherTemplate.content.cloneNode(true)
    chat.querySelector(".chat-sender-name").innerText = data.name
    chat.querySelector(".chat-message").innerText = data.message
    chat.querySelector(".time-sent").innerText = (new Date()).toLocaleTimeString()
    return chat
}

function createChatMessageFromSelf(msg) {
    const chat = chatFromSelfTemplate.content.cloneNode(true)
    chat.querySelector(".chat-message").innerText = msg
    chat.querySelector(".time-sent").innerText =  (new Date()).toLocaleTimeString()
    return chat
}

function isScrolledToBottom(elem, wiggleRoom = 5) {
    return elem.scrollHeight - elem.scrollTop <= elem.clientHeight + wiggleRoom
}