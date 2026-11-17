
import "server-only";
import { createAdminClient } from "../../lib/supabase/admin";

export async function getAccounts() {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("accounts")
        .select("id, username, profile_url, niche, created_at, posts(count)")
        .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((account: any) => ({
        id: account.id,
        username: account.username,
        profile_url: account.profile_url,
        niche: account.niche,
        created_at: account.created_at,
        post_count: Array.isArray(account.posts) && account.posts[0] ? (account.posts[0].count ?? 0) : 0,
    }));
}

export async function deleteAccount(id: string) {
    const supabase = createAdminClient();

    await supabase.from("posts").delete().eq("account_id", id);
    await supabase.from("analysis_run_accounts").delete().eq("account_id", id);

    const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", id);

    if (error) throw error;

    return true;
}

export async function createAccount(
    username: string,
    niche?: string
) {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("accounts")
        .insert({
            username,
            profile_url: `https://www.instagram.com/${username}/`,
            niche: niche ?? null,
        })
        .select()
        .single();

    if (error) throw error;

    return data;
}
