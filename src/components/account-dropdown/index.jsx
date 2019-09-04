import {
  AccountsQuery,
  Dropdown,
  DropdownItem,
  Spinner,
  UserStorageMutation,
  UserStorageQuery,
  nerdlet,
} from "nr1";
import PropTypes from "prop-types";
import React from "react";

const collection = "newrelic";
const documentId = "default-account";

export class AccountDropdown extends React.Component {
  static propTypes = {
    className: PropTypes.any,
    onSelect: PropTypes.func,
    style: PropTypes.any,
    title: PropTypes.string,
    urlState: PropTypes.object,
  };

  static defaultProps = {
    title: "Select account...",
  };

  constructor(props) {
    super(props);

    this.state = {
      accounts: null,
      defaultAccount: undefined,
      selected: null,
    };

    this.select = this.select.bind(this);
  }

  async componentDidMount() {
    await Promise.all([this.loadAccounts(), this.loadDefaultAccount()]);
    this.setState(state => {
      if (this.props.urlState && this.props.urlState.account) {
        const account = this.state.accounts.find(
          account => account.id === this.props.urlState.account
        );
        if (account) {
          return {
            selected: account,
            selectedFromUrlState: true,
          };
        }
      }

      if (state.selected === null && state.defaultAccount && state.accounts) {
        const account = this.state.accounts.find(
          account => account.id === this.state.defaultAccount
        );
        if (account) {
          return {
            selected: account,
          };
        }
      }

      return null;
    });
  }

  async componentDidUpdate(prevProps, prevState) {
    const prevAccount = prevState.selected;
    const account = this.state.selected;

    if (account && (!prevAccount || account.id !== prevAccount.id)) {
      this.props.onSelect(account);

      if (!this.state.selectedFromUrlState) {
        if (this.state.selected.id !== this.state.defaultAccount) {
          this.updateDefaultAccount(this.state.selected);
        }

        if (this.props.urlState && this.state.selected.id !== this.props.urlState.account) {
          nerdlet.setUrlState({
            account: this.state.selected.id,
          });
        }
      }
    }
  }

  async loadDefaultAccount() {
    const result = await UserStorageQuery.query({ collection, documentId });
    const id = ((((result.data || {}).actor || {}).nerdStorage || {}).document || {}).id || null;
    this.setState(() => ({
      defaultAccount: id,
    }));
  }

  async loadAccounts() {
    const result = await AccountsQuery.query();
    const accounts = result.data.actor.accounts;
    this.setState({
      accounts,
      accountsById: accounts.reduce((result, account) => {
        result[account.id] = account.name;
        return result;
      }, {}),
    });
  }

  async updateDefaultAccount(account) {
    await UserStorageMutation.mutate({
      actionType: UserStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
      collection,
      document: { id: account.id },
      documentId,
    });

    this.setState({
      defaultAccount: account.id,
    });
  }

  select(account) {
    this.setState(state => {
      if (!state.selected || state.selected.id !== account.id) {
        return {
          selected: account,
          selectedFromUrlState: false,
        };
      }

      return {};
    });
  }

  render() {
    const { className, style, title } = this.props;
    const { accounts, defaultAccount, selected } = this.state;

    if (!accounts || defaultAccount === undefined) {
      return <Spinner fillcontainer />;
    }

    const items = accounts.map(account => (
      <DropdownItem key={account.id} onClick={() => this.select(account)}>
        {account.name}
      </DropdownItem>
    ));

    return (
      <Dropdown className={className} style={style} title={(selected || {}).name || title}>
        {items}
      </Dropdown>
    );
  }
}
