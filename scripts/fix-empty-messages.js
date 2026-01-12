/**
 * Script to re-extract message content from messages with empty body
 * Run this after deploying the fix to extract content from old messages
 * 
 * Usage: node scripts/fix-empty-messages.js [session_id]
 */

const db = require('../src/models');

/**
 * Extract message content from raw message object
 */
function extractMessageContent(message) {
  if (!message) return '';
  
  // Extract text from various message types
  if (message.conversation) {
    return message.conversation;
  }
  
  if (message.extendedTextMessage?.text) {
    return message.extendedTextMessage.text;
  }
  
  // Image with caption
  if (message.imageMessage?.caption) {
    return message.imageMessage.caption;
  }
  
  // Video with caption
  if (message.videoMessage?.caption) {
    return message.videoMessage.caption;
  }
  
  // Document with caption
  if (message.documentMessage?.caption) {
    return message.documentMessage.caption;
  }
  
  // Audio message (no text content, return empty)
  if (message.audioMessage) {
    return '';
  }
  
  // Sticker (no text content)
  if (message.stickerMessage) {
    return '';
  }
  
  // Location message
  if (message.locationMessage) {
    const loc = message.locationMessage;
    return loc.name || loc.address || `Location: ${loc.degreesLatitude},${loc.degreesLongitude}`;
  }
  
  // Contact message
  if (message.contactMessage) {
    return message.contactMessage.displayName || message.contactMessage.vcard || 'Contact';
  }
  
  // Contact array
  if (message.contactsArrayMessage) {
    return `${message.contactsArrayMessage.contacts?.length || 0} contacts`;
  }
  
  // Button response
  if (message.buttonsResponseMessage) {
    return message.buttonsResponseMessage.selectedDisplayText || message.buttonsResponseMessage.selectedButtonId || '';
  }
  
  // List response
  if (message.listResponseMessage) {
    return message.listResponseMessage.title || message.listResponseMessage.singleSelectReply?.selectedRowId || '';
  }
  
  // Template button reply
  if (message.templateButtonReplyMessage) {
    return message.templateButtonReplyMessage.selectedDisplayText || message.templateButtonReplyMessage.selectedId || '';
  }
  
  // Live location
  if (message.liveLocationMessage) {
    const loc = message.liveLocationMessage;
    return `Live Location: ${loc.degreesLatitude},${loc.degreesLongitude}`;
  }
  
  // Product message
  if (message.productMessage) {
    return message.productMessage.product?.title || 'Product';
  }
  
  // Order message
  if (message.orderMessage) {
    return `Order: ${message.orderMessage.itemCount || 0} items`;
  }
  
  // Invoice message
  if (message.invoiceMessage) {
    return message.invoiceMessage.note || 'Invoice';
  }
  
  // Poll creation
  if (message.pollCreationMessage) {
    return message.pollCreationMessage.name || 'Poll';
  }
  
  // Poll update
  if (message.pollUpdateMessage) {
    return 'Poll vote';
  }
  
  // Reaction
  if (message.reactionMessage) {
    return message.reactionMessage.text || '(reaction)';
  }
  
  // View once message
  if (message.viewOnceMessage) {
    return extractMessageContent(message.viewOnceMessage.message || {});
  }
  
  // Ephemeral message
  if (message.ephemeralMessage) {
    return extractMessageContent(message.ephemeralMessage.message || {});
  }
  
  // Protocol message (usually system messages)
  if (message.protocolMessage) {
    const types = {
      0: 'Message deleted',
      1: 'Message revoked',
      2: 'Ephemeral setting changed',
      3: 'Ephemeral sync response',
      4: 'History sync notification',
      5: 'App state sync key share',
      6: 'App state sync key request',
      7: 'Message edit'
    };
    return types[message.protocolMessage.type] || 'System message';
  }
  
  return '';
}

/**
 * Main function
 */
async function fixEmptyMessages(sessionId = null) {
  try {
    console.log('🔧 Starting fix for empty message content...\n');

    // Build query
    const where = {
      content: ['', null]
    };

    if (sessionId) {
      where.session_id = sessionId;
      console.log(`📍 Filtering by session: ${sessionId}`);
    }

    // Find all messages with empty content
    const messages = await db.Message.findAll({
      where,
      attributes: ['id', 'session_id', 'message_id', 'remote_jid', 'content', 'metadata', 'type'],
      order: [['timestamp', 'ASC']]
    });

    console.log(`\n📊 Found ${messages.length} messages with empty content\n`);

    if (messages.length === 0) {
      console.log('✅ No messages to fix!');
      return;
    }

    let fixed = 0;
    let noMetadata = 0;
    let stillEmpty = 0;

    for (const message of messages) {
      try {
        // Check if metadata exists and has raw_message
        if (!message.metadata || !message.metadata.raw_message) {
          noMetadata++;
          continue;
        }

        // Extract content from raw message
        const newContent = extractMessageContent(message.metadata.raw_message);

        if (newContent) {
          // Update message with extracted content
          await message.update({ content: newContent });
          fixed++;
          
          if (fixed % 10 === 0) {
            process.stdout.write(`\r✅ Fixed: ${fixed} | ⚠️  No metadata: ${noMetadata} | ⏭️  Still empty: ${stillEmpty}`);
          }
        } else {
          stillEmpty++;
        }
      } catch (error) {
        console.error(`Failed to fix message ${message.id}:`, error.message);
      }
    }

    console.log(`\n\n✨ Fix completed!`);
    console.log(`\n📈 Statistics:`);
    console.log(`   Total processed: ${messages.length}`);
    console.log(`   ✅ Successfully fixed: ${fixed}`);
    console.log(`   ⚠️  No metadata (can't fix): ${noMetadata}`);
    console.log(`   ⏭️  Still empty (media/system messages): ${stillEmpty}`);
    console.log(`\n💡 Note: Messages without metadata were sent before the fix was deployed.`);
    console.log(`   These messages cannot be recovered unless WhatsApp still has the history.`);
    
    if (fixed > 0) {
      console.log(`\n🎉 ${fixed} messages have been successfully recovered!`);
    }

  } catch (error) {
    console.error('❌ Error fixing messages:', error);
    throw error;
  }
}

// Run script
if (require.main === module) {
  const sessionId = process.argv[2] || null;
  
  fixEmptyMessages(sessionId)
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixEmptyMessages, extractMessageContent };
