import AddressBook from './AddressBook';

export default function AddressBookTab() {
  return (
    <div>
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Address Book</h2>
          <p className="tab-subtitle">Search, import, and manage public keys for your contacts.</p>
        </div>
      </div>
      <AddressBook />
    </div>
  );
}
