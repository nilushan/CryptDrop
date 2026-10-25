import { keySecuritySummary, keySecuritySafeguards, keySecurityLimitations, privateKeySecurityHref } from '../../lib/key-security';

export default function KeySecurityDisclosure() {
  return (
    <details className="key-security-disclosure">
      <summary>
        <span className="key-security-heading">How your private key is protected</span>
        <span className="key-security-summary">{keySecuritySummary}</span>
      </summary>
      <div className="key-security-content">
        <div className="key-security-columns">
          <div>
            <h3>Safeguards in place</h3>
            <ul>{keySecuritySafeguards.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <h3>Browser limitations</h3>
            <ul>{keySecurityLimitations.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
        <a href={privateKeySecurityHref} target="_blank" rel="noopener noreferrer">Security details and higher-risk use (opens in a new tab)</a>
      </div>
    </details>
  );
}
