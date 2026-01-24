module privacy::admin {
    use std::signer;
    use privacy::privacy_transfer;

    /// Entry function to set pause status
    public entry fun set_pause_status(admin_signer: &signer, paused: bool) {
        let admin_addr = signer::address_of(admin_signer);
        privacy_transfer::set_pause_status_internal(admin_addr, paused);
    }

    /// Entry function to change admin
    public entry fun change_admin(admin_signer: &signer, new_admin: address) {
        let admin_addr = signer::address_of(admin_signer);
        privacy_transfer::change_admin_internal(admin_addr, new_admin);
    }
}
