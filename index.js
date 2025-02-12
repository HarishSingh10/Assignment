require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

app.post("/identify", async (req, res) => {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
        return res.status(400).json({ error: "Either email or phoneNumber must be provided" });
    }

    try {
       
        const { data: existingContacts, error } = await supabase
            .from("Contact")
            .select("*")
            .or(`email.eq.${email},phone_number.eq.${phoneNumber}`);

        if (error) throw error;

        let primaryContact = null;

        if (existingContacts.length === 0) {
            
            const { data: newContact, error: insertError } = await supabase
                .from("Contact")
                .insert([{ 
                    email, 
                    phone_number: phoneNumber, 
                    link_precedence: "primary",
                    created_at: new Date(),
                    updated_at: new Date()
                }])
                .select()
                .single();

            if (insertError) throw insertError;
            return res.json({ contact: newContact });
        }

        
        primaryContact = existingContacts.find(c => c.link_precedence === "primary") || existingContacts[0];

        
        const alreadyExists = existingContacts.some(
            c => (email && c.email === email) && (phoneNumber && c.phone_number === phoneNumber)
        );

        if (!alreadyExists) {
            
            const { data: newSecondary, error: insertError } = await supabase
                .from("Contact")
                .insert([{ 
                    email, 
                    phone_number: phoneNumber, 
                    linked_id: primaryContact.id,  
                    link_precedence: "secondary",
                    created_at: new Date(),
                    updated_at: new Date()
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return res.json({ contact: newSecondary });
        }

    
        return res.json({ contact: primaryContact });

    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));
