
import { supabaseAdmin } from '../src/utils/supabaseAdmin';
async function run() {
    try {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;
        console.log('USERS_START');
        console.log(JSON.stringify(data.users.map((u: any) => ({ id: u.id, email: u.email })), null, 2));
        console.log('USERS_END');
    } catch (err) {
        console.error(err);
    }
}
run();
