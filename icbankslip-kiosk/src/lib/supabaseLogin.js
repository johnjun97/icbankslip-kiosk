import { supabase } from "./supabase"


export const kioskLogin = async () => {

    const { error } =
        await supabase.auth.signInWithPassword({
            email: import.meta.env.VITE_KIOSK_EMAIL,
            password: import.meta.env.VITE_KIOSK_PASSWORD
        })


    if (error) {
        console.error(error)
        return false
    }

    console.log("Kiosk logged in")

    // const { data } = await supabase.auth.getSession()

    // console.log(data.session)

    return true
}