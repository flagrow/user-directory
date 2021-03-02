import app from 'flarum/app';
import Page from 'flarum/components/Page';
import ItemList from 'flarum/utils/ItemList';
import listItems from 'flarum/helpers/listItems';
import IndexPage from 'flarum/components/IndexPage';
import Select from 'flarum/components/Select';
import Button from 'flarum/components/Button';
import LinkButton from 'flarum/components/LinkButton';
import SelectDropdown from 'flarum/components/SelectDropdown';
import Dropdown from 'flarum/components/Dropdown';
import UserDirectoryList from './UserDirectoryList';
import UserDirectoryState from '../states/UserDirectoryState';
import CheckableButton from './CheckableButton';
import SearchField from './SearchField';
import Separator from 'flarum/components/Separator';

/**
 * This page re-uses Flarum's IndexPage CSS classes
 */
export default class UserDirectoryPage extends Page {
    oninit(vnode) {
        super.oninit(vnode);

        this.state = new UserDirectoryState({});
        this.state.refreshParams(app.search.params());

        this.bodyClass = 'User--directory';

        let idSegments = [];
        if (this.params().q) {
            Array.from(this.params().q.matchAll(/group:([\d,]+)/g)).forEach((match) => {
                idSegments.push(match[1]);
            });
        }
        this.enabledGroupFilters = idSegments
            .join(',')
            .split(',')
            .filter((id) => id);

        this.enabledSpecialGroupFilters = [];
    }

    view() {
        return (
            <div className="IndexPage">
                {IndexPage.prototype.hero()}
                <div className="container">
                    <div className="sideNavContainer">
                        <nav className="IndexPage-nav sideNav">
                            <ul>{listItems(this.sidebarItems().toArray())}</ul>
                        </nav>
                        <div className="IndexPage-results sideNavOffset">
                            <div className="IndexPage-toolbar">
                                <ul className="IndexPage-toolbar-view">{listItems(this.viewItems().toArray())}</ul>
                                <ul className="IndexPage-toolbar-action">{listItems(this.actionItems().toArray())}</ul>
                            </div>
                            <UserDirectoryList state={this.state} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /**
     * Our own sidebar. Re-uses Index.sidebarItems as the base
     * Elements added here will only show up on the user directory page
     *
     * @return {ItemList}
     */
    sidebarItems() {
        const items = IndexPage.prototype.sidebarItems();

        items.replace(
            'nav',
            SelectDropdown.component(
                {
                    buttonClassName: 'Button',
                    className: 'App-titleControl',
                },
                this.navItems().toArray()
            )
        );

        return items;
    }

    /**
     * Our own sidebar navigation. Re-uses Index.navItems as the base
     * Elements added here will only show up on the user directory page
     *
     * @return {ItemList}
     */
    navItems() {
        const items = IndexPage.prototype.navItems();
        const params = this.stickyParams();

        items.add(
            'fof-user-directory',
            LinkButton.component(
                {
                    href: app.route('fof_user_directory', params),
                    icon: 'far fa-address-book',
                },
                app.translator.trans('fof-user-directory.forum.page.nav')
            ),
            85
        );

        return items;
    }

    viewItems() {
        const items = new ItemList();
        const sortMap = this.state.sortMap();

        const sortOptions = {};
        for (const i in sortMap) {
            sortOptions[i] = app.translator.trans('fof-user-directory.lib.sort.' + i);
        }

        items.add(
            'sort',
            Select.component({
                options: sortOptions,
                value: this.params().sort || app.forum.attribute('userDirectoryDefaultSort'),
                onchange: this.changeParams.bind(this),
            })
        );

        const groupButtons = app.store
            .all('groups')
            .filter((group) => group.id() !== '2' && group.id() !== '3')
            .map(
                (group) =>
                    CheckableButton.component(
                        {
                            className: 'GroupFilterButton',
                            icon: group.icon(),
                            checked: this.enabledGroupFilters.includes(group.id()),
                            onclick: () => {
                                const id = group.id();
                                if (this.enabledGroupFilters.includes(id)) {
                                    this.enabledGroupFilters = this.enabledGroupFilters.filter((e) => e != id);
                                } else {
                                    this.enabledGroupFilters.push(id);
                                }

                                this.changeParams(this.params().sort);
                            },
                        },
                        group.namePlural()
                    ),
                this
            );

        if (app.initializers.has('flarum-suspend') && app.forum.attribute('suspend')) {
            groupButtons.splice(
                0,
                0,
                CheckableButton.component(
                    {
                        className: 'GroupFilterButton',
                        icon: 'fas fa-ban',
                        checked: this.enabledSpecialGroupFilters.includes('flarum-suspend'),
                        onclick: () => {
                            const id = 'flarum-suspend';
                            if (this.enabledSpecialGroupFilters.includes(id)) {
                                this.enabledSpecialGroupFilters = this.enabledSpecialGroupFilters.filter((e) => e != id);
                            } else {
                                this.enabledSpecialGroupFilters.push(id);
                            }

                            this.changeParams(this.params().sort);
                        }
                    },
                    app.translator.trans('flarum-suspend.forum.user_badge.suspended_tooltip')
                )
            );

            groupButtons.splice(1, 0, Separator.component());
        }

        items.add(
            'filterGroups',
            Dropdown.component(
                {
                    caretIcon: 'fas fa-filter',
                    label: app.translator.trans('fof-user-directory.forum.page.filter_button'),
                    buttonClassName: 'FormControl',
                    className: 'GroupFilterDropdown',
                },
                groupButtons
            )
        );

        items.add(
            'search',
            SearchField.component({
                state: this.state,
            })
        );

        return items;
    }

    actionItems() {
        const items = new ItemList();

        items.add(
            'refresh',
            Button.component({
                title: app.translator.trans('fof-user-directory.forum.page.refresh_tooltip'),
                icon: 'fas fa-sync',
                className: 'Button Button--icon',
                onclick: () => {
                    this.state.refresh();
                    if (app.session.user) {
                        app.store.find('users', app.session.user.id());
                        m.redraw();
                    }
                },
            })
        );

        return items;
    }

    /**
     * Redirect to the index page using the given sort parameter.
     *
     * @param {String} sort
     */
    changeParams(sort) {
        const params = this.params();

        if (sort === app.forum.attribute('userDirectoryDefaultSort')) {
            delete params.sort;
        } else {
            params.sort = sort;
        }

        const suspend = this.enabledSpecialGroupFilters.includes('flarum-suspend') ? 'is:suspended' : '';

        if (this.enabledGroupFilters.length > 0) {
            params.qBuilder = { groups: 'group:' + this.enabledGroupFilters.join(',') };
        } else {
            params.qBuilder = { groups: '', q: suspend };
        }

        this.state.refreshParams(params);
    }

    stickyParams() {
        return {
            sort: m.route.param('sort'),
            q: m.route.param('q'),
        };
    }

    params() {
        return this.stickyParams();
    }
}
