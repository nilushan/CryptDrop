import AddressBook from './AddressBook';

export default function AddressBookTab() {
  return (
    <div>
      <div className="tab-header">
        <div>
          <h1 className="tab-title">Your address book.</h1>
          <p className="tab-subtitle">Search, import, and manage public keys for your contacts.</p>
        </div>
      </div>
      <AddressBook />
    </div>
  );
}
