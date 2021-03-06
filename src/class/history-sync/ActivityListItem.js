import PropTypes from 'prop-types';
import React from 'react';
import BrowserStorage from '../BrowserStorage';
import Permissions from '../Permissions';
import Request from "../Request";
import TmdbImage from '../tmdb/TmdbImage';
import ActivityActionCreators from './ActivityActionCreators';
import TraktURLForm from './TraktURLForm';
import TraktWebAPIUtils from './TraktWebAPIUtils';

class ActivityListItem extends React.Component {
  constructor(props) {
    super(props);
    this.state = {isUpdating: false, showTraktURLForm: false, traktClick: false, traktError: false};
  }

  componentDidMount() {
    this.props.componentHandler.upgradeDom();
  }

  _onChange(event) {
    ActivityActionCreators.toggleActivity(this.props.activity, event.target.checked);
  }

  _onShowTraktURLForm() {
    this.setState({isUpdating: false, showTraktURLForm: true, traktClick: false, traktError: false});
  }

  async _onUseSuggestion(activity, url) {
    this.setState({showTraktURLForm: true, traktClick: true});
    this._onSubmitTraktURL(activity, url);
  }

  async _onSubmitTraktURL(activity, url) {
    this.setState({isUpdating: true});
    try {
      await TraktWebAPIUtils.getActivityFromURL(activity, url);
      this.setState({showTraktURLForm: false});
      const storage = await BrowserStorage.get(`options`);
      if (storage.options && storage.options.sendReceiveSuggestions && (await Permissions.contains(undefined, [`*://script.google.com/*`, `*://script.googleusercontent.com/*`]))) {
        Request.send({
          method: `POST`,
          params: {
            id: TraktWebAPIUtils._getTraktCacheId(activity),
            url
          },
          url: `https://script.google.com/macros/s/AKfycbxaD_VEcZVv9atICZm00TWvF3XqkwykWtlGE8Ne39EMcjW5m3w/exec`,
          success: () => {},
          error: () => {}
        });
      }
    } catch (error) {
      this.setState({isUpdating: false, traktError: true});
    }
  }

  render() {
    let activity = this.props.activity;
    let netflix = activity.netflix;
    let netflixTitle = netflix.epTitle ? `${netflix.title}: ${netflix.epTitle}` : netflix.title;
    let netflixUrl = `https://www.netflix.com/watch/${netflix.id}`;
    let trakt = activity.trakt;
    let traktDate = ``;
    let traktUrl = ``;
    let traktTitle = ``;

    if (trakt) {
      traktDate = trakt.date ? trakt.date.format(`MMMM Do YYYY, h:mm:ss a`) : `-`;
      traktUrl = trakt.season ? `https://trakt.tv/shows/${trakt.show.ids.slug}/seasons/${trakt.season}/episodes/${trakt.number}` : `https://trakt.tv/movies/${trakt.ids.slug}`;
      traktTitle = trakt.show ? `${trakt.show.title}: ${trakt.title}` : trakt.title;
    }

    let formId = `${netflix.id}--add`;

    let suggestions = [];
    if (activity.suggestions && activity.suggestions.length) {
      for (const [index, suggestion] of activity.suggestions.entries()) {
        suggestions.push(
          <span key={index}><br/>{suggestion.count} {browser.i18n.getMessage(`suggestionCount`)} <a href={`https://trakt.tv/${suggestion.url}`}>{suggestion.url}</a>. <a className='paste-trakt-url' onClick={() => this._onUseSuggestion(activity, suggestion.url)}>{browser.i18n.getMessage(`useSuggestion`)}</a></span>
        );
      }
    }

    return (
      <li className='mdl-list__item mdl-list__item--three-line'>
        <span className='mdl-list__item-primary-content'>
          <TmdbImage
            className='mdl-list__item-avatar'
            item={trakt}
            imageHost={this.props.imageHost}
            imageWidth={this.props.imageWidth}
          />
          <span><a href={netflixUrl}
                   target='noopener noreferrer _blank'>{browser.i18n.getMessage(`netflixTitle`)}: {netflixTitle}</a></span>
          <span> / </span>
          <span><a href={traktUrl}
                   target='noopener noreferrer _blank'>{browser.i18n.getMessage(`traktTitle`)}: {traktTitle}</a></span>
          <span className='mdl-list__item-text-body'>
            {browser.i18n.getMessage(`netflixDate`)}: {netflix.date.format('MMMM Do YYYY, h:mm:ss a')} / {browser.i18n.getMessage(`traktDate`)}: {traktDate}
            {suggestions}
            <br/>
            {browser.i18n.getMessage(`isThisWrong`)} <a className='paste-trakt-url'
                                                       onClick={this._onShowTraktURLForm.bind(this)}>{browser.i18n.getMessage(`pasteTraktUrl`)}</a>
            <TraktURLForm activity={activity} show={this.state.showTraktURLForm} error={this.state.traktError} isUpdating={this.state.isUpdating}
                          click={this.state.traktClick} onSubmit={this._onSubmitTraktURL.bind(this)}/>
          </span>
        </span>
        <span className='mdl-list__item-secondary-action' style={{display: !trakt ? 'block' : 'none'}}>
          {browser.i18n.getMessage(`notFoundTrakt`)}
        </span>
        <span className='mdl-list__item-secondary-action' style={{display: activity.alreadyOnTrakt ? 'block' : 'none'}}>
          {browser.i18n.getMessage(`alreadySynced`)}
        </span>
        <span className='mdl-list__item-secondary-action' style={{display: !trakt || activity.alreadyOnTrakt ? 'none' : 'block'}}>
          <label className='mdl-switch mdl-js-switch mdl-js-ripple-effect' htmlFor={formId}>
            <input type='checkbox' id={formId} className='mdl-switch__input activity-item-switch' checked={activity.add}
                   onChange={this._onChange.bind(this)}/>
          </label>
        </span>
      </li>
    );
  }
}

ActivityListItem.propTypes = {
  activity: PropTypes.object,
  componentHandler: PropTypes.object,
  imageHost: PropTypes.string,
  imageWidth: PropTypes.object
};

export default ActivityListItem;
