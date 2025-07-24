// Ensure the DOM is fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');

    // 1. Create the main chatbox elements
    const chatBox = document.createElement('div');
    chatBox.className = 'chat-box';

    const chatMessages = document.createElement('div');
    chatMessages.className = 'chat-messages';

    const chatInput = document.createElement('div');
    chatInput.className = 'chat-input';

    const messageInput = document.createElement('input');
    messageInput.type = 'text';
    messageInput.placeholder = 'Type your message...';

    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';

    // 2. Assemble the chatbox structure by appending elements
    chatInput.appendChild(messageInput);
    chatInput.appendChild(sendButton);

    chatBox.appendChild(chatMessages);
    chatBox.appendChild(chatInput);

    chatContainer.appendChild(chatBox);

    // Global variable to hold the current state of the conversation
    let chatState = {
        current: 'initial', // 'initial', 'main_menu', 'inquiry_topic', 'complaint_topic', 'complaint_details_pending', 'ended'
        complaintData: {
            type: '',
            details: '',
            ticket: ''
        },
        lastOptionsElement: null // To keep track of the last options container added
    };

    // Image URLs for avatars
    const botAvatarUrl = 'chat-bot-logo-design-concept-600nw-2478937557.webp'; // Using the provided bot image
    const userAvatarUrl = 'https://placehold.co/30x30/28a745/white?text=YOU'; // Placeholder for user


    // Company contact number for unresolved queries
    const contactNumber = "1-800-555-0199";


    // 3. Function to add a message to the chat interface, now including an avatar.
    /**
     * Adds a message to the chat interface, now including an avatar.
     * @param {string} message - The text content of the message.
     * @param {'You' | 'Bot'} sender - The sender of the message ('You' or 'Bot').
     */
    const addMessage = (message, sender) => {
        const messageRow = document.createElement('div');
        messageRow.className = `message-row ${sender.toLowerCase()}`; // Add class for row alignment

        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        avatar.src = sender === 'You' ? userAvatarUrl : botAvatarUrl;
        avatar.alt = `${sender} Avatar`;
        // Add onerror to handle broken image links
        avatar.onerror = function() {
            this.onerror=null; // Prevent infinite loop
            this.src='https://placehold.co/30x30/cccccc/000000?text=?'; // Fallback
        };


        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.className = sender === 'You' ? 'user-message' : 'bot-message';

        // Append elements based on sender for correct layout (avatar left/right)
        if (sender === 'You') {
            messageRow.appendChild(messageElement);
            messageRow.appendChild(avatar);
        } else {
            messageRow.appendChild(avatar);
            messageRow.appendChild(messageElement);
        }

        chatMessages.appendChild(messageRow);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    // 4. Function to add a bot message with clickable options
    /**
     * Adds a bot message followed by a set of clickable options (buttons).
     * @param {string} message - The text content of the bot's question.
     * @param {Array<string>} options - An array of strings, each representing an option.
     */
    const addOptionsMessage = (message, options) => {
        addMessage(message, 'Bot'); // First, add the bot's question

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-container';

        options.forEach(optionText => {
            const button = document.createElement('button');
            button.textContent = optionText;
            button.className = 'option-button';
            button.addEventListener('click', () => {
                // Disable all buttons in this set after one is clicked
                Array.from(optionsContainer.children).forEach(btn => {
                    btn.disabled = true;
                });
                // Add the user's selected option as a message
                addMessage(optionText, 'You');
                // Process the selected option as if the user typed it
                processBotResponse(optionText);
            });
            optionsContainer.appendChild(button);
        });

        chatMessages.appendChild(optionsContainer);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        chatState.lastOptionsElement = optionsContainer; // Store reference to disable later if needed
    };

    // 5. Function to generate a unique ticket number
    const generateTicketNumber = () => {
        return 'TICKET-' + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 4).toUpperCase();
    };

    // 6. Function to generate and download the complaint PDF
    /**
     * Generates a PDF document with complaint details and triggers download.
     * @param {Object} data - Object containing complaint type, details, and ticket number.
     */
    const generateComplaintPdf = (data) => {
        // Corrected check for jsPDF library availability
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            console.error("jsPDF library is not loaded or not correctly initialized. Cannot generate PDF.");
            addMessage("Error: PDF generation failed. jsPDF library not found or initialized.", "Bot");
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Set font for consistency
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.setTextColor(40, 40, 40); // Dark gray color
        doc.text("Company Complaint Report", 105, 25, null, null, "center");

        // Add a line below the header
        doc.setDrawColor(0, 123, 255); // Blue line
        doc.setLineWidth(0.5);
        doc.line(20, 30, 190, 30); // x1, y1, x2, y2

        let yOffset = 45; // Starting Y position for content

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);

        const addDetail = (label, value) => {
            doc.text(`${label}:`, 20, yOffset);
            doc.setFont("helvetica", "bold");
            doc.text(value, 60, yOffset);
            doc.setFont("helvetica", "normal");
            yOffset += 7;
        };

        addDetail("Date", new Date().toLocaleDateString());
        addDetail("Time", new Date().toLocaleTimeString());
        addDetail("Ticket Number", data.ticket);
        addDetail("Complaint Type", data.type);

        yOffset += 10; // Add extra space before details section
        doc.setFont("helvetica", "bold");
        doc.text("Complaint Details:", 20, yOffset);
        doc.setFont("helvetica", "normal");
        yOffset += 7;

        // Split text into lines if it's too long
        const splitDetails = doc.splitTextToSize(data.details, 170); // Max width 170mm
        doc.text(splitDetails, 20, yOffset);
        yOffset += (splitDetails.length * 7) + 10; // Adjust yOffset based on number of lines

        // Add a footer
        doc.setDrawColor(0, 123, 255);
        doc.line(20, doc.internal.pageSize.height - 20, 190, doc.internal.pageSize.height - 20);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Generated by Company Support Chatbot", 105, doc.internal.pageSize.height - 10, null, null, "center");


        doc.save(`Complaint_${data.ticket}.pdf`);
    };

    // 7. Main bot response logic
    /**
     * Processes the user's message or selected option and generates a bot response.
     * @param {string} userMessageOrOption - The message sent by the user or the text of the selected option.
     */
    const processBotResponse = (userMessageOrOption) => {
        const lowerCaseInput = userMessageOrOption.toLowerCase();
        let botResponse = `I'm not sure how to respond to that. Please choose from the options or try rephrasing. If you need further assistance, please call us at ${contactNumber}.`;

        // Disable/enable input field based on state
        messageInput.disabled = false;
        sendButton.disabled = false;

        switch (chatState.current) {
            case 'initial':
                addOptionsMessage("How can I assist you today?", ["General Inquiry", "Complaint", "End Chat"]);
                chatState.current = 'main_menu';
                messageInput.disabled = true;
                sendButton.disabled = true;
                return;

            case 'main_menu':
                if (lowerCaseInput.includes('general inquiry')) {
                    addOptionsMessage("What kind of inquiry do you have?", ["About Services", "Contact Information", "Business Hours", "Other"]);
                    chatState.current = 'inquiry_topic';
                    messageInput.disabled = true;
                    sendButton.disabled = true;
                    return;
                } else if (lowerCaseInput.includes('complaint')) {
                    addOptionsMessage("Please select the type of complaint:", ["Product Issue", "Service Issue", "Billing Issue", "Other Complaint"]);
                    chatState.current = 'complaint_topic';
                    messageInput.disabled = true;
                    sendButton.disabled = true;
                    return;
                } else if (lowerCaseInput.includes('end chat')) { // New "End Chat" option
                    botResponse = "Thank you for using our chatbot! We're here to help if you need anything else.";
                    chatState.current = 'ended'; // Set state to ended
                    // No need to add message here, it will be added below
                }
                else {
                    botResponse = `Please choose 'General Inquiry' or 'Complaint' from the options provided. If you need further assistance, please call us at ${contactNumber}.`;
                    setTimeout(() => {
                        addOptionsMessage("How can I assist you today?", ["General Inquiry", "Complaint", "End Chat"]); // Re-present options
                    }, 500);
                    return;
                }
                break; // Break from switch if not 'end chat'

            case 'inquiry_topic':
                if (lowerCaseInput.includes('about services')) {
                    botResponse = "We offer a wide range of services including web development, mobile app creation, and cloud solutions. Is there a specific service you'd like to know more about?";
                } else if (lowerCaseInput.includes('contact information')) {
                    botResponse = "You can reach our support team at support@example.com or call us at 123-456-7890.";
                } else if (lowerCaseInput.includes('business hours')) {
                    botResponse = "Our business hours are Monday to Friday, 9 AM to 5 PM.";
                } else if (lowerCaseInput.includes('other')) {
                    botResponse = `Please type your specific inquiry, and I'll do my best to help. If I can't, please call us at ${contactNumber}.`;
                } else {
                    botResponse = `Please choose a valid inquiry topic from the options. If you need further assistance, please call us at ${contactNumber}.`;
                    setTimeout(() => {
                        addOptionsMessage("What kind of inquiry do you have?", ["About Services", "Contact Information", "Business Hours", "Other"]);
                    }, 500);
                    return;
                }
                chatState.current = 'initial'; // Reset to initial state after answering
                break;

            case 'complaint_topic':
                // User selected a complaint type. Store it and ask for details directly.
                chatState.complaintData.type = userMessageOrOption; // Store the selected complaint type
                botResponse = `Understood. Please describe your ${userMessageOrOption.toLowerCase()} in detail.`;
                chatState.current = 'complaint_details_pending'; // Move to state where we expect details
                break;

            case 'complaint_details_pending':
                // User provided complaint details. Generate ticket and PDF.
                chatState.complaintData.details = userMessageOrOption;
                chatState.complaintData.ticket = generateTicketNumber();

                botResponse = `Thank you for providing the details. Your complaint has been registered. Your ticket number is: ${chatState.complaintData.ticket}.`;

                // Add the bot message first
                addMessage(botResponse, 'Bot');

                // Then offer the download button
                setTimeout(() => {
                    const downloadButton = document.createElement('button');
                    downloadButton.textContent = 'Download Complaint PDF';
                    downloadButton.className = 'download-button';
                    downloadButton.addEventListener('click', () => {
                        generateComplaintPdf(chatState.complaintData);
                        downloadButton.disabled = true; // Disable after one click
                        downloadButton.textContent = 'PDF Downloaded';
                    });
                    chatMessages.appendChild(downloadButton);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }, 500); // Short delay for button to appear

                chatState.current = 'initial'; // Reset to initial state
                chatState.complaintData = { type: '', details: '', ticket: '' }; // Clear complaint data
                // No return here, let it fall through to re-offer main menu
                break;

            case 'ended': // If chat is already ended, do nothing
                return;

            default:
                botResponse = `Something went wrong. Let's start over. If you need further assistance, please call us at ${contactNumber}.`;
                chatState.current = 'initial';
                break;
        }

        // If the chat is in an 'ended' state, disable input and button
        if (chatState.current === 'ended') {
            messageInput.disabled = true;
            sendButton.disabled = true;
            messageInput.placeholder = "Chat ended. Please refresh to start a new chat.";
        } else if (chatState.current === 'initial' || chatState.current === 'complaint_details_pending') {
            // If the bot has responded and is not waiting for options, enable input
            messageInput.disabled = false;
            sendButton.disabled = false;
        } else {
            // If bot is waiting for options, disable input
            messageInput.disabled = true;
            sendButton.disabled = true;
        }


        // Add the bot's final response after a delay, unless it's handled by addOptionsMessage
        if (chatState.current !== 'main_menu' && chatState.current !== 'inquiry_topic' && chatState.current !== 'complaint_topic' && chatState.current !== 'ended') {
            setTimeout(() => {
                // Only add message if it hasn't been added by the download button logic
                if (chatState.current === 'initial' && userMessageOrOption.toLowerCase().includes('complaint') && chatState.complaintData.ticket !== '') {
                    // Do nothing, message already added by download button logic
                } else {
                    addMessage(botResponse, 'Bot');
                }

                // If the conversation is back to initial (and not ended), offer main menu again
                if (chatState.current === 'initial') {
                    setTimeout(() => {
                        addOptionsMessage("Is there anything else I can help you with?", ["General Inquiry", "Complaint", "End Chat"]); // Added "End Chat"
                        chatState.current = 'main_menu';
                        messageInput.disabled = true;
                        sendButton.disabled = true;
                    }, 1000); // Small delay before re-presenting main options
                }
            }, 500);
        } else if (chatState.current === 'ended') {
            // For the 'ended' state, ensure the "Thank you" message is displayed
            setTimeout(() => {
                addMessage(botResponse, 'Bot');
            }, 500);
        }
    };

    // 8. Event listener for the send button
    sendButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message && !messageInput.disabled) { // Only send if not disabled
            addMessage(message, 'You');
            messageInput.value = '';
            processBotResponse(message);
        }
    });

    // 9. Event listener for the Enter key press in the input field
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !messageInput.disabled) { // Only send if not disabled
            sendButton.click();
        }
    });

    // 10. Initial greeting from the bot and present the first set of options
    setTimeout(() => {
        processBotResponse(""); // Call with empty string to trigger initial options
    }, 1000); // 1 second delay for initial greeting
});